//一个简易的node.js服务器，
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

app.get("/api", (req, res) => {
  setTimeout(() => {
    res.json({ data: "Hello World!" });
  }, 5000)
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
