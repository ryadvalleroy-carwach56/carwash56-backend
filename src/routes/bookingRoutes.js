import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * POST /api/bookings
 * Reçoit la demande de lavage depuis l'app mobile
 * et l'insère MANUELLEMENT dans MongoDB sans passer
 * par les validations Mongoose strictes.
 */
router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      address,
      carMake,
      carModel,
      carColor,
      timeslot, // ex: "30/10/2025 14h"
      serviceId, // ex: "6901f4...."
    } = req.body;

    // Vérif minimum
    if (
      !fullName ||
      !phone ||
      !address ||
      !carMake ||
      !timeslot ||
      !serviceId
    ) {
      return res
        .status(400)
        .json({ error: "Missing required fields" });
    }

    // Récupérer le service pour prix/durée
    let serviceObjId;
    try {
      serviceObjId = new mongoose.Types.ObjectId(serviceId);
    } catch (e) {
      return res.status(400).json({ error: "Invalid serviceId" });
    }

    const serviceDoc = await mongoose.connection
      .collection("services")
      .findOne({ _id: serviceObjId });

    if (!serviceDoc) {
      return res.status(400).json({ error: "Service not found" });
    }

    // Convertir "30/10/2025 14h" -> objet Date JS
    let scheduledAtDate = null;
    try {
      const [datePart, hourPartRaw] = timeslot.split(" "); // ["30/10/2025","14h"]
      const [day, month, year] = datePart.split("/");
      const hour = hourPartRaw.replace("h", "");
      scheduledAtDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        0,
        0
      );
    } catch (e) {
      scheduledAtDate = null;
    }

    // Construire le document à stocker
    const bookingData = {
      fullName,
      phone,
      locationAddress: address,
      carMake,
      carModel,
      carColor,
      timeslotClientText: timeslot, // texte tel que saisi
      scheduledAt: scheduledAtDate, // Date (ou null si parsing raté)

      service: {
        _id: serviceObjId,
        name: serviceDoc.name,
        priceEUR: serviceDoc.priceEUR,
        durationMin: serviceDoc.durationMin,
      },

      totalPriceEUR: serviceDoc.priceEUR ?? 0,
      status: "pending",
      createdAt: new Date(),
    };

    // Insertion directe dans "bookings"
    const result = await mongoose.connection
      .collection("bookings")
      .insertOne(bookingData);

    return res.json({
      ok: true,
      bookingId: result.insertedId,
      booking: bookingData,
    });
  } catch (err) {
    console.error("booking error RAW INSERT >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

/**
 * GET /api/bookings
 * Liste brute des réservations pour contrôle (tableau de missions)
 */
router.get("/", async (req, res) => {
  try {
    const list = await mongoose.connection
      .collection("bookings")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.json(list);
  } catch (err) {
    console.error("list bookings error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Permet de marquer une mission comme "done", "pending", etc.
 * Body attendu: { "status": "done" }
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    // Essai avec ObjectId
    let updated = null;
    try {
      updated = await mongoose.connection
        .collection("bookings")
        .findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(bookingId) },
          { $set: { status: status } },
          { returnDocument: "after" }
        );
    } catch (e) {
      // si l'ObjectId casse (id pas au bon format),
      // on tente une mise à jour en string brute
    }

    if (!updated || !updated.value) {
      updated = await mongoose.connection
        .collection("bookings")
        .findOneAndUpdate(
          { _id: bookingId },
          { $set: { status: status } },
          { returnDocument: "after" }
        );
    }

    if (!updated || !updated.value) {
      return res
        .status(404)
        .json({ error: "Booking not found (after both tries)" });
    }

    return res.json({
      ok: true,
      booking: updated.value,
    });
  } catch (err) {
    console.error("update status error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

/**
 * GET /api/bookings/:id/receipt
 * Donne un reçu propre pour le client (preuve d'intervention / facture simple)
 */
router.get("/:id/receipt", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // essayer d'interpréter l'id comme ObjectId Mongo
    let objectId = null;
    try {
      objectId = new mongoose.Types.ObjectId(bookingId);
    } catch (e) {
      objectId = null;
    }

    // on tente d'abord avec ObjectId
    let booking = null;
    if (objectId) {
      booking = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: objectId });
    }
    // fallback: essayer avec l'id brut en string
    if (!booking) {
      booking = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: bookingId });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const receipt = {
      company: "Carwash56",
      doneAt: new Date().toISOString().slice(0, 10), // AAAA-MM-JJ
      bookingId: booking._id,
      status: booking.status,
      client: {
        name: booking.fullName,
        phone: booking.phone,
        address: booking.locationAddress,
      },
      vehicle: {
        make: booking.carMake,
        model: booking.carModel,
        color: booking.carColor,
      },
      service: {
        name: booking.service?.name,
        durationMin: booking.service?.durationMin,
        priceEUR: booking.totalPriceEUR,
      },
      timeslot: {
        clientText: booking.timeslotClientText,
        plannedDate: booking.scheduledAt,
      },
    };

    return res.json(receipt);
  } catch (err) {
    console.error("receipt error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

export default router;
