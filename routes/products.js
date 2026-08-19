const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken, authorizeRoles } = require("./middleware");

const router = express.Router();
const dbFilePath = path.join(__dirname, "..", "db.json");

router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const perPage = parseInt(req.query.perPage) || 10;

  fs.readFile(dbFilePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);
    const start = page * perPage;
    const end = start + perPage;
    const result = jsonData.items.slice(start, end);

    res.status(200).json({
      items: result,
      total: jsonData.items.length,
      page,
      perPage,
      totalPages: Math.ceil(jsonData.items.length / perPage),
    });
  });
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);

  fs.readFile(dbFilePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);
    const item = jsonData.items.find((entry) => entry.id === id);

    if (!item) {
      res.status(404).send("Not Found");
      return;
    }

    res.status(200).json(item);
  });
});

router.post("/", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const { image, name, price, rating } = req.body;

  fs.readFile(dbFilePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);
    const maxId = jsonData.items.reduce((max, item) => Math.max(max, item.id), 0);
    const newItem = {
      id: maxId + 1,
      image,
      name,
      price,
      rating,
    };

    jsonData.items.push(newItem);

    fs.writeFile(dbFilePath, JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(201).json(newItem);
    });
  });
});

router.put("/:id", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const id = parseInt(req.params.id);
  const { image, name, price, rating } = req.body;

  fs.readFile(dbFilePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);
    const index = jsonData.items.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).send("Not Found");
      return;
    }

    jsonData.items[index] = {
      id,
      image,
      name,
      price,
      rating,
    };

    fs.writeFile(dbFilePath, JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(200).json(jsonData.items[index]);
    });
  });
});

router.delete("/:id", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const id = parseInt(req.params.id);

  fs.readFile(dbFilePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);
    const index = jsonData.items.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).send("Not Found");
      return;
    }

    jsonData.items.splice(index, 1);

    fs.writeFile(dbFilePath, JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(204).send();
    });
  });
});

module.exports = router;
