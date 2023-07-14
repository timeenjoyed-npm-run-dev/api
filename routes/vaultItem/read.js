const express = require('express');
const { getVaultItems, getVaultItem } = require('../../firebaseConfig.js');
const router = express.Router();

router.get("/items", async function(req, res, next) {
    try {
        const messages = await getVaultItems();

        return res.status(200).json({ messages });
    } catch (err) {
        return res.status(500).json({ error: err });
    }
})

router.get("/item", async function(req, res, next) {
    const id = req.body.id;

    try {
        const message = await getVaultItem(id);

        return res.status(200).json({ message });
    } catch (err) {
        return res.status(500).json({ error: err });
    }
})

module.exports = router;
