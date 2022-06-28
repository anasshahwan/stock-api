const express = require("express");
const app = express();
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const stockRoutes = require("./routes/stocks");
const bodyParser = require("body-parser");
const mySqlConnection = require("./helpers/mysql-connection");
const port = 8081;
const path = require("path");
const amqp = require("amqplib");
const cors = require("cors");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
var channel, connection;

const swaggerOptions = {
  swaggerDefinition: {
    components: {},
    info: {
      title: "Stock Api",
      description: "Stock Api allows you to get all the stocks",
      contact: {
        name: "Anas Shahwan",
      },
      servers: ["http://localhost:8081"],
    },
  },
  apis: ["./routes/*.js"],
};

async function connect() {
  const amqpServer = "amqp://host.docker.internal:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("STOCK");
}

connect().then(() => {
  console.log("RabbitMQ is connected. in Stock API");
  channel.consume("COMPANY", (data) => {
    // do the data base here.s
    console.log("Consuming STOCK service");
    const msg = data.content.toString();
    console.log("Im a stock api and listening to company", msg);

    /// I will do the insertion here ..
    let company_code = data.content.toString();

    const sql = `select stock_price,create_at from stocks where company_code="${company_code}"`;

    mySqlConnection.query(sql, async function (err, result) {
      if (err) throw err;
      console.log("Fetch the Stocks");
      channel.ack(data);
      console.log("Aknolewege");

      console.log(result);
      channel.sendToQueue("STOCK", Buffer.from(JSON.stringify({ result })));
    });
    console.log("from stock was send to company");
  });
  // channel.consume("COMPANY_1", (data) => {
  //   // do the data base here.s
  //   console.log("Consuming company_1 ");
  //   const msg = data.content.toString();
  //   console.log(msg);

  //   /// I will do the insertion here ..
  //   let company_code = data.content.toString();

  //   const sql = `select stock_price,create_at from stocks where company_code="${company_code}"`;

  //   mySqlConnection.query(sql, async function (err, result) {
  //     if (err) throw err;
  //     console.log("Fetch the Stocks");
  //     channel.ack(data);
  //     console.log("Aknolewege");

  //     console.log(result);
  //     // channel.sendToQueue("STOCK_1", Buffer.from(JSON.stringify({ result })));
  //   });
  //   console.log("from stock was send to company");
  // });
});

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const createStocksTable = () => {
  const sql =
    "CREATE TABLE stocks (id int primary key NOT NULL AUTO_INCREMENT, company_code VARCHAR(255) NOT NULL, stock_price DOUBLE, create_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)";
  mySqlConnection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
};

app.get("/", (req, res) => {
  res.send("Hello Stock Api");
});

app.use("/api/v1.0/market/stock", stockRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
