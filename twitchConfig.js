require('dotenv').config();

const TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const REDEMPTION_COST = 5000;
const REDEMPTION_COOLDOWN = 10 * 60;
const MAX_PER_USER_PER_STREAM = 1;
const POLLING_INTERVAL = 15 * 1000;

const customRewardBody = {
    is_enabled: true,

    title: "Time Capsule",
    prompt: "<<< Add an entry into the time capsule >>>",
    cost: REDEMPTION_COST,
    is_user_input_required: true,

    is_global_cooldown_enabled: true,
    global_cooldown_seconds: REDEMPTION_COOLDOWN,

    is_max_per_user_per_stream_enabled: true,
    max_per_user_per_stream: MAX_PER_USER_PER_STREAM,
};

let clientId = "";
let userId = "";
let headers = {};
let rewardId = "";
let pollingInterval;

// validates the provided token and validates the token has the correct scope(s). additionally, uses the response to pull the correct client_id and broadcaster_id
async function validateToken() {
    let body;

    try {
        const response = await fetch(`https://id.twitch.tv/oauth2/validate`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        });

        body = await response.json();
    } catch (error) {
        console.error("[Error]:", error + '\nThis could be due to an invalid token. Please get a new token using twitch token -u -s "channel:manage:redemptions".');

        return false;
    }

    if (body.scopes.indexOf("channel:manage:redemptions") == -1 || !body.hasOwnProperty('user_id')) {
        console.error('Invalid scopes. Please get a new token using twitch token -u -s "channel:manage:redemptions"');

        return false;
    }

    // update the global variables to returned values
    clientId = body.client_id;
    userId = body.user_id;
    headers = {
        "Authorization": `Bearer ${TOKEN}`,
        "Client-ID": clientId,
        "Content-Type": "application/json"
    };

    return true;
}

// returns an object containing the custom rewards, or if an error, null
async function getCustomRewards() {
    try {
        const response = await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${userId}`, { headers: headers })
        const { data } = await response.json();

        return data;
    } catch (error) {
        console.error("[Error]:", error);

        return null;
    }
}

// if the custom reward doesn't exist, creates it. returns true if successful, false if not
async function addCustomReward() {
    try {
        const response = await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${userId}`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(customRewardBody),
            responseType: 'json',
        });
        const body = await response.json();

        rewardId = body.data[0].id;

        return true;
    } catch (error) {
        console.error("[Error]:", error);

        return false;
    }
}

// function for polling every 15 seconds to check for user redemptions 
async function pollForRedemptions() {
    try {
        const response = await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${userId}&reward_id=${rewardId}&status=UNFULFILLED`, {
            headers: headers,
            responseType: 'json',
        });
        const { data } = await response.json();

        let redemptions = data;
        let successfulRedemptions = [];
        let failedRedemptions = [];

        for (let redemption of redemptions) {
            // TODO: Handle cases when this errors, push redemption.id to failedRedemptions instead
            writeNewVaultItem(redemption.user_name, redemption.user_input);

            // TODO: Don't assume success
            successfulRedemptions.push(redemption.id);
        }

        // do this in parallel
        await Promise.all([
            fulfillRewards(successfulRedemptions, "FULFILLED"),
            fulfillRewards(failedRedemptions, "CANCELED")
        ]);

        console.log(`[Debug] Processed ${successfulRedemptions.length + failedRedemptions.length} redemptions.`);

        // instead of an interval, we wait x between completion and the next call
        pollingInterval = setTimeout(pollForRedemptions, POLLING_INTERVAL);
    } catch (error) {
        console.error("[Error]:", error);
    }
}

const fulfillRewards = async (ids, status) => {
    // if empty, just cancel
    if (ids.length == 0) {
        return;
    }

    // transforms the list of ids to ids=id for the API call
    ids = ids.map(v => `id=${v}`);

    try {
        await fetch(`https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${userId}&reward_id=${rewardId}&${ids.join("&")}`, {
            method: "PATCH",
            headers: headers,
            body: JSON.stringify({
                status: status
            })
        });
    } catch (error) {
        console.error(error);
    }
}

// sets up the reward and sets the interval for polling
async function twitchSetup() {
    if (await validateToken() == false) {
        return;
    }

    let rewards = await getCustomRewards();

    if (rewards != null) {
        rewards.forEach(v => {
            // since the title is enforced as unique, it will be a good identifier to use to get the right ID on cold-boot
            if (v.title == customRewardBody.title) {
                rewardId = v.id
            }
        });
    } else {
        console.error("The streamer does not have access to Channel Points. They need to be a Twitch Affiliate or Partner.");
    }

    // if the reward isn't set up, add it 
    if (rewardId == "" && await addCustomReward() == false) {
        return;
    }

    pollForRedemptions()
}

module.exports = twitchSetup;