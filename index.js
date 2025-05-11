(async function connectionLogic() {
    "use strict";
    const {
        DisconnectReason,
        useMultiFileAuthState,
        MessageType,
        MessageOptions,
        Mimetype,
        generateWAMessageFromContent,
        generateWAMessageContent,
        proto,
        jidDecode,
        downloadContentFromMessage
    } = require("baileys");
    const makeWASocket = require("baileys").default;
    const { MongoClient } = require("mongodb");
    const useMongoDBAuthState = require("./mongostate.js");
    const { type } = require("os");
    require("dotenv").config();

    const mongoURL = process.env.MONGODB_URI || "";
    const dbName = process.env.DB_NAME || "";
    const collName = process.env.COLL_NAME || "";

    const mongoClient = new MongoClient(mongoURL);
    await mongoClient.connect();
    const collection = mongoClient.db(dbName).collection(collName);
    const isPaired = [false];

    const { state, saveCreds } = await useMongoDBAuthState(collection);

    const sock = makeWASocket({
        printQRInTerminal: false,
        mobile: false,
        auth: state,
        logger: {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {},
            trace: () => {},
            fatal: () => {},
            child: () => {
                return {
                    info() {},
                    warn() {},
                    error() {},
                    debug() {},
                    trace() {},
                    fatal() {},
                    child() {
                        return this;
                    }
                };
            }
        }
    });

    sock.ev.on("connection.update", async update => {
        console.log("Update connection");
        const { connection, lastDisconnect, qr } = update || {};

        if (!!qr && !isPaired[0]) {
            isPaired[0] = true;
            console.log("Waiting for it...");
            const phoneNumber = "6288216018165";
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("YOUR CODE : ", code);
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                connectionLogic();
            }
        }

        if (connection === "opem") {
            console.log("Success connected to whatsapp");
        }
    });

    sock.ev.on("creds.update", saveCreds);
})();
