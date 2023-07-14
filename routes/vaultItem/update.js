const express = require('express');
const { approveVaultItem } = require('../../firebaseConfig.js');
const router = express.Router();

router.post("/approve", async function(req, res, next) {
    const id = req.body.id;

    try {
        const approvedItem = await approveVaultItem(id);

        return res.status(200).json({ approvedItem });
    } catch (err) {
        return res.status(500).json({ error: err });
    }

});

module.exports = router;
