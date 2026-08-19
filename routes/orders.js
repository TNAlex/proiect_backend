const express = require("express");
const { authenticateToken, authorizeRoles } = require("./middleware");
const { readUsers, readOrders, writeOrders } = require("./storage");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const orders = await readOrders();
    const userId = Number(req.user.sub);
    const visibleOrders = req.user.role === "admin"
      ? orders
      : orders.filter((order) => order.user?.id === userId);

    return res.json(visibleOrders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

router.post("/", authenticateToken, authorizeRoles("client"), async (req, res) => {
  try {
    const cartItems = Array.isArray(req.body.items) ? req.body.items : null;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cosul este gol." });
    }

    const users = await readUsers();
    const userId = Number(req.user?.sub);
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return res.status(404).json({ message: "Utilizatorul nu a fost gasit." });
    }

    const normalizedItems = cartItems.map((item) => ({
      id: Number(item.id),
      image: typeof item.image === "string" ? item.image : "",
      name: typeof item.name === "string" ? item.name : "",
      price: typeof item.price === "string" ? item.price : String(item.price ?? ""),
      rating: Number(item.rating) || 0,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    const totalPrice = normalizedItems.reduce((sum, item) => {
      const itemPrice = Number.parseFloat(item.price) || 0;
      return sum + itemPrice * item.quantity;
    }, 0);

    const orders = await readOrders();
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const newOrder = {
      orderId,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
      },
      items: normalizedItems,
      totalPrice: Number(totalPrice.toFixed(2)),
      createdAt: new Date().toISOString(),
    };

    orders.push(newOrder);
    await writeOrders(orders);

    return res.status(201).json({
      message: "Comanda a fost salvata cu succes.",
      order: newOrder,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

module.exports = router;
