const express = require("express");
const dotenv = require("dotenv");
const db = require("./config/db");
const redisClient = require("./config/redis");
const cookieParser = require("cookie-parser");
const path = require("path");
dotenv.config();

const viewRoutes = require("./routes/views");
const userRoutes = require("./routes/api/user");

const app = express();

db.connect((err) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log("Connected to MySQL db.");
});

app.use(cookieParser("MY_SECRET"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", viewRoutes);
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(5000, () => console.log(`Server is running on port: ${PORT}`));