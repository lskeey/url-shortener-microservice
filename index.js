require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns");
const fs = require("fs");
const app = express();

function isValidHttpUrl(str) {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$", // fragment locator
    "i"
  );
  return pattern.test(str);
}

// Function to handle file storage (reading and writing data)
const fileStorageHandler = (action, data) => {
  const filePath = "./public/data.json";

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]"); // Initialize file with an empty array
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const storedUrls = fileContent.length > 0 ? JSON.parse(fileContent) : [];

    if (action === "save" && data) {
      // Only save if the URL doesn't already exist
      if (
        !storedUrls.some((entry) => entry.original_url === data.original_url)
      ) {
        storedUrls.push(data);
        fs.writeFileSync(filePath, JSON.stringify(storedUrls, null, 2));
      }
    }

    if (action === "load") {
      return storedUrls;
    }
  } catch (err) {
    console.error("Error handling file:", err);
  }
};

// Generate the next available short URL ID
const generateShortUrlId = () => {
  const storedUrls = fileStorageHandler("load");
  const lastShortUrl =
    storedUrls.length > 0 ? storedUrls[storedUrls.length - 1].short_url : 0;

  // Find the next available short URL by incrementing
  let newShortUrl = lastShortUrl + 1;
  while (storedUrls.some((entry) => entry.short_url === newShortUrl)) {
    newShortUrl += 1;
  }

  return newShortUrl;
};

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/shorturl", (req, res) => {
  const input = req.body.url;
  if (!input || input.trim() === "") {
    return res.json({ error: "invalid url" });
  }

  if (!isValidHttpUrl(input)) {
    return res.json({ error: "invalid url" });
  }

  try {
    const url = new URL(req.body.url);
    dns.lookup(url.hostname, (error) => {
      if (error) {
        return res.json({ error: "invalid url" });
      }
      short = generateShortUrlId();
      obj = { original_url: url, short_url: short };
      fileStorageHandler("save", obj);
      return res.json(obj);
    });
  } catch (error) {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/:shorturl", (req, res) => {
  const shortUrlId = Number(req.params.shorturl);
  const storedUrls = fileStorageHandler("load");

  const urlEntry = storedUrls.find((entry) => entry.short_url === shortUrlId);

  if (urlEntry) {
    return res.redirect(urlEntry.original_url);
  }

  return res.status(404).json({ message: "Not found" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
