import Booking from "../models/Booking.js";

export async function createBooking(req, res) {
  try {
    const {
      serviceId,
      carMake,
      carModel,
      carColor,
      address,
      notes,
      scheduledAt,
      totalPriceEUR,
    } = req.body;

    const newBooking = await Booking.create({
      customer: req.user.id,
      service: serviceId,
      carMake,
      carModel,
      carColor,
      locationAddress: address,
      locationNotes: notes,
      scheduledAt,
      totalPriceEUR,
      status: "pending",
      paymentStatus: "unpaid",
    });

    res.json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création réservation" });
  }
}

export async function getMyBookings(req, res) {
  const bookings = await Booking.find({ customer: req.user.id })
    .populate("service")
    .sort({ createdAt: -1 });

  res.json(bookings);
}

export async function listAllBookings(req, res) {
  const all = await Booking.find()
    .populate("customer", "fullName phone")
    .populate("service", "name priceEUR")
    .sort({ scheduledAt: 1 });

  res.json(all);
}
