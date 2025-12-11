const path = require("path");
const express = require("express");
const session = require("express-sesion"):
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
	res.send("Hello from Node Container!");
});

app.listen(PORT, () => {
	console.log("Server running on port " + PORT);
});
