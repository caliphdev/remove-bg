// Remove Background Image
const express = require('express');
const app = express();
const setting = require('./setting.json');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const visitors = JSON.parse(fs.readFileSync(path.join(__dirname, "db", "visitors.json")));

const {
  processImage
} = require('./lib/process');
const {
  exec
} = require('child_process');
const tempFolderPath = path.join(__dirname, 'temporary');
const cron = require('node-cron');
const socketio = require('socket.io');
const os = require('os');
const { bytesFormatter, toHHMMSS, formatToUnits } = require("./lib/functions");


if (!fs.existsSync(tempFolderPath)) {
  console.log('Creating Temporary Folder...');
  fs.mkdirSync(tempFolderPath);
}


// Express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use("/files", express.static(tempFolderPath));
app.set('views', path.join(__dirname, 'views'));

// Multer ( File Upload )
const storage = multer.diskStorage({
  destination: tempFolderPath,
  filename: function (req, file, cb) {
    cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname));
  }
});

// Limit File Size ( 10 MB )
const upload = multer({
  storage: storage, limits: {
    fileSize: 1048576 * 10
  }
});

// Index Page
app.get('/', (req, res) => {
  res.render('index', {
    ...setting
  });
});

app.all('/stats', (req, res) => {
  let { token } = req.body;
  if (!token || req.method !== "POST") return res.render("authorize");
  if (token !== setting.authtoken) return res.render("authorize", { error: "Invalid Token, please check your token" });
  res.render('stats');
});

app.get("/api/appweb/visit", function (req, res) {
visitors.push(req.get('User-Agent'));
fs.writeFileSync(path.join(__dirname, "db", "visitors.json"), JSON.stringify(visitors, null, 2));
res.type("text/javascript");
res.send(`console.log("Hello! you are a visitor to: "+ "${visitors.length}")`);
});

// Upload Image
app.post("/api/process/nobg", upload.single('image'), async (req, res) => {
  if (req.file) {
    if (req.file.mimetype != "image/png" && req.file.mimetype != "image/jpeg") {
      fs.unlinkSync(req.file.path);
      return res.json({
        error: "Only PNG and JPEG Image Allowed"
      });
    }
    try {
      processImages = await processImage(req.file.path);
      fileid = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
      dts = tempFolderPath + "/" + fileid;
      await fs.promises.writeFile(dts, processImages);
      size = bytesFormatter(processImages.length);
      res.json({
        image: "/files/"+ fileid, size
      });
    } catch (error) {
      res.json({
        error: "Unknown Error, Please Try Again"
      });
      fs.unlinkSync(req.file.path);
      console.log(error);
    }
    fs.unlinkSync(req.file.path);
    console.log(req.file.path);
  } else {
    res.status(400).json({
      error: "Please Upload some Image"
    });
  }
});

app.use((req, res) => res.status(404).render("404"));

// Start Server
const server = app.listen(process.env.PORT || setting.port || 3000, () => {
  console.log('Server Started on Port ' + (process.env.PORT || setting.port || 3000));
});

const io = socketio(server);

io.on('connection', socket => {
  console.log('A client has connected');

  socket.on('disconnect', () => {
    console.log('A client has disconnected');
  });
});

setInterval(() => {
  const {
    rss,
    heapUsed,
    heapTotal
  } = process.memoryUsage();
  cpu = os.loadavg()[0] * 100 / os.cpus().length
  io.emit('ServerStats', {
    memory: {
      rss: bytesFormatter(rss),
      heapUsed: bytesFormatter(heapUsed),
      heapTotal: bytesFormatter(heapTotal),
    },
    cpu: cpu.toFixed(2) + "%",
    uptime: toHHMMSS(Math.floor(process.uptime())),
    visit: visitors.length > 9999 ? formatToUnits(visitors.length) : visitors.length
  }
  );
}, 1000);

cron.schedule('*/5 * * * *', () => {
  // Reading the contents of the temporary folder
  fs.readdir(tempFolderPath, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      // Deleting all files in the temporary folder
      files.forEach((file) => {
        fs.unlinkSync(`${tempFolderPath}/${file}`);
      });
      console.log(`All files in the temporary folder have been deleted on ${new Date()}`);
    }
  });
});
