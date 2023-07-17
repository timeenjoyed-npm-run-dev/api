const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, child, get, update, remove } = require("firebase/database");
const { randomUUID } = require('crypto');

require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    databaseURL: process.env.DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

async function writeNewVaultItem(username, message) {
    const db = getDatabase(app);
    const uuid = randomUUID();

    try {
        await set(ref(db, `messages/${uuid}`), {
            id: uuid,
            username,
            message,
            pending: true,
        });

        return {
            id: uuid,
            username,
            message,
            pending: true,
        }
    } catch (err) {
        throw err;
    }
}

async function approveVaultItem(id) {
    const db = getDatabase(app);

    try {
        const item = await getVaultItem(id);
        const updates = {};

        updates[`/messages/${id}`] = { ...item, pending: false };
        await update(ref(db), updates);

        return { ...item, pending: false }
    } catch (err) {
        throw err;
    }
}

async function rejectVaultItem(id) {
    const db = getDatabase(app);

    try {
        // check if item exists
        await getVaultItem(id);

        await remove(ref(db, `/messages/${id}`));

        const snapshot = await get(child(ref(db), "/messages"));

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return {};
        }
    } catch (err) {
        throw err;
    }
}

async function getVaultItems() {
    const dbRef = ref(getDatabase());

    try {
        const snapshot = await get(child(dbRef, "/messages"));

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return {};
        }
    } catch (err) {
        throw err;
    }
}

async function getVaultItem(id) {
    const dbRef = ref(getDatabase());

    try {
        const snapshot = await get(child(dbRef, `/messages/${id}`));

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            throw "No item(s) found with that id";
        }
    } catch (err) {
        throw err;
    }
}

module.exports = {
    writeNewVaultItem,
    getVaultItems,
    getVaultItem,
    approveVaultItem,
    rejectVaultItem,
};
