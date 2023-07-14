const express = require('express');
const { rejectVaultItem } = require('../../firebaseConfig.js');
const router = express.Router();

router.post("/reject", async function(req, res, next) {
    const id = req.body.id;

    try {
        const messages = await rejectVaultItem(id);

        return res.status(200).json({ messages });
    } catch (err) {
        return res.status(500).json({ error: err });
    }

});

module.exports = router;
