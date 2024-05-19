const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("washingSupplied");
    const collection = db.collection("user");
    const ProductsCollection = db.collection("products");
    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });
      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;
      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });
      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    //  get all Supplied Products
    app.get("/api/v1/products", async (req, res) => {
      let query = {};
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      const cursor = ProductsCollection.find(query);
      const testimonial = await cursor.toArray();
      res.send({ status: true, data: testimonial });
    });
    // get data by category
    app.get("/api/v1/", async (req, res) => {
      const category = req.query.category;
      let datas = [];
      if (category == "all-products") {
        datas = await ProductsCollection.find({}).toArray();
        return res.send({ status: true, message: "success", data: datas });
      }
      datas = await ProductsCollection.find({
        category__name: { $regex: category, $options: "i" },
      }).toArray();
      res.send({ status: true, message: "success", data: datas });
    });

    // get single data
    app.get("/api/v1/product/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ProductsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // ==============================================================
    // Start the server
    app.listen(port, () => {
      console.log(
        `Washing Supplied store Server is running on http://localhost:${port}`
      );
    });
  } finally {
  }
}
run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Washing Supplied store Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
