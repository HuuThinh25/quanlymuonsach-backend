require("dotenv").config();

const app = require("./app");
const config = require("./app/config");
const MongoDB = require("./app/utils/mongodb.util");
const createIndexes = require("./app/utils/indexes");

async function startServer() {
    try {
        await MongoDB.connect(config.db.uri);
        console.log("Connected to the database!");

        await createIndexes(MongoDB.client);

        const PORT = config.app.port;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Cannot connect to the database!", error);
        process.exit();
    }
}

startServer();
