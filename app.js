const express = require("express");
const firestoreService = require("firestore-export-import");
const path = require("path");

const indexRouter = require("./routes/index");
const serviceAccount = require("./serviceAccountKey.json");
const scraper = require("./scraper");

const app = express();
const databaseURL = "https://home-auditor.firebaseio.com";

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Start Firebase
firestoreService.initializeApp(serviceAccount, databaseURL);

// Routes
app.use("/", indexRouter);
app.get("/", function(req, res, next) {
  scraper(inputURL);
  res.render("index");
});

app.get("/scraper/:ObjectID", function(req, res) {
  const inputURL = req.params.ObjectID;
  scraper(inputURL);
  res.render("index");
});
// End Routes

app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
