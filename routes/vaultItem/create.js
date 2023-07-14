const express = require('express');
const { writeNewVaultItem } = require('../../firebaseConfig.js');
const router = express.Router();

router.post("/item", async function(req, res, next) {
    // Have this data come from Twitch chat instead of body
    const username = req.body.username;
    const message = req.body.message;

    try {
        const item = await writeNewVaultItem(username, message);

        return res.status(200).json({ message: item });
    } catch (err) {
        return res.status(500).json({ error: err });
    }

});

module.exports = router;
