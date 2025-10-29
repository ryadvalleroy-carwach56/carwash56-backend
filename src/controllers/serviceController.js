import Service from "../models/Service.js";

export async function listServices(req, res) {
  const services = await Service.find({ active: true }).sort({ priceEUR: 1 });
  res.json(services);
}

export async function createService(req, res) {
  try {
    const { name, description, priceEUR, durationMin } = req.body;
    const svc = await Service.create({
      name,
      description,
      priceEUR,
      durationMin,
      active: true,
    });
    res.json(svc);
  } catch (err) {
    res.status(500).json({ error: "Cannot create service" });
  }
}
