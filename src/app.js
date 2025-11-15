// src/app.js
require('dotenv').config();
const express = require("express");
const path = require("path"); // <-- tambahkan ini
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryItemRoutes = require("./routes/categoryItemRoutes");
const dailyProductionRoutes = require("./routes/dailyProductionRoutes");
const deliveryOrderRoutes = require("./routes/deliveryOrderRoutes");
const requestRoutes = require("./routes/requestRoutes");
const uomRoutes = require("./routes/uomRoutes");
const itemRoutes = require("./routes/itemRoutes");
const devPwRouter = require('./routes/dev-passwords');
const productionOrderRoutes = require("./routes/productionOrderRoutes");
const kitchenRoutes = require("./routes/kitchenRoutes");
const kitchenWorkflowRoutes = require("./routes/kitchenWorkflowRoutes");
const storeInventoryRoutes = require('./routes/storeInventoryRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const itemComponentsRoutes = require('./routes/itemComponents');
const brandRoutes = require('./routes/brandRoutes');
const sfgRoutes = require('./routes/sfgRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const inventoryRoutes = require("./routes/inventoryRoutes");
const storeRequestRoutes = require('./routes/storeRequestRoutes');


const app = express();

const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [FRONTEND, "http://localhost:3000", "http://localhost:5173"];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['content-type', 'authorization'],
  credentials: true,
}));

// Parsers
app.use(express.json());
// jika butuh form-urlencoded uncomment di bawah:
// app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/category-items", categoryItemRoutes);
app.use("/api/daily-production", dailyProductionRoutes);
app.use("/api/delivery-order", deliveryOrderRoutes);
app.use("/api/request", requestRoutes);
app.use('/api/store-requests', storeRequestRoutes);
app.use("/api/uoms", uomRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use('/dev', devPwRouter);

// production orders
app.use("/api/production-orders", productionOrderRoutes);

// NOTE: dua router berikut monting ke path yang sama "/api/kitchen".
// Jika keduanya punya route yang mirip, urutan mounting akan menentukan
// mana yang dieksekusi. Pertimbangkan ubah path atau gabungkan router.
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/kitchen", kitchenWorkflowRoutes);

app.use('/api/stores-inventory', storeInventoryRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/item-components', itemComponentsRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/sfgs', sfgRoutes);
app.use('/api/recipes', recipeRoutes);

// serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Healthcheck
app.get("/", (req, res) => res.json({ status: "ok" }));

module.exports = app;
