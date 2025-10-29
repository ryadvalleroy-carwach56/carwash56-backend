import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * POST /api/bookings
 * Reçoit la demande de lavage depuis l'app mobile
 * et l'insère MANUELLEMENT dans MongoDB sans passer
 * par les validations Mongoose.
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
      timeslot,    // ex: "29/10/2025 14h"
      serviceId,   // ex: "6900c2168af0ac8de3011e2d"
    } = req.body;

    // Vérif minimum
    if (
      !fullName ||
      !phone ||
      !address ||
      !carMake ||
      !carModel ||
      !timeslot ||
      !serviceId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Récupérer le service pour prix
    const serviceDoc = await mongoose.connection
      .collection("services")
      .findOne({ _id: new mongoose.Types.ObjectId(serviceId) });

    if (!serviceDoc) {
      return res.status(400).json({ error: "Service not found" });
    }

    // Convertir le créneau client "29/10/2025 14h" -> vraie Date
    let scheduledAtDate = null;
    try {
      const [datePart, hourPartRaw] = timeslot.split(" "); // ["29/10/2025","14h"]
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
      // si on n'arrive pas à parser, on met null
      scheduledAtDate = null;
    }

    // Construire le document qu'on veut stocker
    const bookingData = {
      fullName,
      phone,
      locationAddress: address,
      carMake,
      carModel,
      carColor,
      timeslotClientText: timeslot, // texte original tapé par le client
      scheduledAt: scheduledAtDate, // objet Date (ou null si on n'a pas pu parser)
      service: {
        _id: new mongoose.Types.ObjectId(serviceId),
        name: serviceDoc.name,
        priceEUR: serviceDoc.priceEUR,
        durationMin: serviceDoc.durationMin,
      },
      totalPriceEUR: serviceDoc.priceEUR ?? 0,
      status: "pending",
      createdAt: new Date(),
    };

    // Insertion directe dans la collection bookings
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
 * Liste brute des réservations pour contrôle
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
 * Body JSON attendu : { "status": "done" }
 *
 * On essaye de mettre à jour le statut en utilisant d'abord l'ObjectId Mongo,
 * puis en retentant avec l'ID traité comme string brute.
 * Ensuite on relit le doc et on le renvoie.
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    // Essayer de caster l'id en ObjectId
    let objectId = null;
    try {
      objectId = new mongoose.Types.ObjectId(bookingId);
    } catch (e) {
      objectId = null;
    }

    let updateResult = null;

    // 1. Essai avec ObjectId
    if (objectId) {
      updateResult = await mongoose.connection
        .collection("bookings")
        .updateOne(
          { _id: objectId },
          { $set: { status: status } }
        );
    }

    // 2. Si ça n'a rien touché, essai avec string brute
    if (!updateResult || updateResult.matchedCount === 0) {
      updateResult = await mongoose.connection
        .collection("bookings")
        .updateOne(
          { _id: bookingId },
          { $set: { status: status } }
        );
    }

    // 3. Si toujours rien => pas trouvé
    if (!updateResult || updateResult.matchedCount === 0) {
      console.log("DEBUG updateOne: no match for", bookingId);
      return res
        .status(404)
        .json({ error: "Booking not found (updateOne both tries)" });
    }

    // 4. Relire le doc après l'update pour le renvoyer au client
    let updatedDoc = null;

    if (objectId) {
      updatedDoc = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: objectId });
    }

    if (!updatedDoc) {
      updatedDoc = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: bookingId });
    }

    if (!updatedDoc) {
      console.log("DEBUG findOne after update: no doc for", bookingId);
      return res.json({
        ok: true,
        booking: {
          _id: bookingId,
          status: status,
          note: "Status updated but re-fetch failed",
        },
      });
    }

    return res.json({
      ok: true,
      booking: updatedDoc,
    });
  } catch (err) {
    console.error("update status error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

/**
 * POST /api/bookings/:id/done
 * Option alternative si un jour PATCH pose problème côté mobile,
 * mais normalement on utilise PATCH dans l'app admin.
 */
router.post("/:id/done", async (req, res) => {
  try {
    const bookingId = req.params.id;

    let objectId = null;
    try {
      objectId = new mongoose.Types.ObjectId(bookingId);
    } catch (e) {
      objectId = null;
    }

    let updateResult = null;

    if (objectId) {
      updateResult = await mongoose.connection
        .collection("bookings")
        .updateOne(
          { _id: objectId },
          { $set: { status: "done" } }
        );
    }

    if (!updateResult || updateResult.matchedCount === 0) {
      updateResult = await mongoose.connection
        .collection("bookings")
        .updateOne(
          { _id: bookingId },
          { $set: { status: "done" } }
        );
    }

    if (!updateResult || updateResult.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: "Booking not found (done try)" });
    }

    let updatedDoc = null;

    if (objectId) {
      updatedDoc = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: objectId });
    }

    if (!updatedDoc) {
      updatedDoc = await mongoose.connection
        .collection("bookings")
        .findOne({ _id: bookingId });
    }

    return res.json({
      ok: true,
      booking: updatedDoc ?? { _id: bookingId, status: "done" },
    });
  } catch (err) {
    console.error("mark done error >>>", err);
    return res
      .status(500)
      .json({ error: "Server error", details: String(err) });
  }
});

export default router;
