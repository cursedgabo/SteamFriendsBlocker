const CONFIG = {
    TIMING: {
        PAGE_LOAD: 2000,
        MENU_DELAY: 500,
        MODAL_DELAY: 500,
        MIN_DELAY: 2000,
        MAX_DELAY: 5000,
        ELEMENT_TIMEOUT: 3000
    },
    SELECTORS: {
        ACTION_BUTTON: '#profile_action_dropdown_link',
        BLOCK_LINK: 'a[href="javascript:ConfirmBlock();"]',
        UNBLOCK_LINK: 'a[href="javascript:ConfirmUnblock();"]',
        CONFIRM_BUTTON: '.newmodal_buttons .btn_green_steamui span',
        FRIEND_ELEMENTS: '.friend_block_v2',
        FRIEND_NAME: '.friend_block_content',
        PROFILE_NAME: '.friends_header_name a'
    },
    COLORS: {
        SUCCESS: '#4CAF50',
        WARNING: '#FFC107',
        ERROR: '#F44336',
        INFO: '#878282',
        DEFAULT: '#FFFFFF'
    }
};

const logHelper = {
    success: (msg) => console.log(`%c[✓] ${msg}`, `color: ${CONFIG.COLORS.SUCCESS}; font-weight: bold`),
    warning: (msg) => console.log(`%c[⚠] ${msg}`, `color: ${CONFIG.COLORS.WARNING}; font-weight: bold`),
    error: (msg) => console.log(`%c[✗] ${msg}`, `color: ${CONFIG.COLORS.ERROR}; font-weight: bold`),
    info: (msg) => console.log(`%c[ℹ] ${msg}`, `color: ${CONFIG.COLORS.INFO}; font-weight: bold`),
    default: (msg) => console.log(`%c${msg}`, `color: ${CONFIG.COLORS.DEFAULT}`)
};

async function waitForElement(win, selector, timeout = CONFIG.TIMING.ELEMENT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkElement = () => {
            const element = win.document.querySelector(selector);
            if (element) resolve(element);
            else if (Date.now() - startTime > timeout) reject(new Error(`Timeout waiting for the new tab response (This might be due to pop-ups. If it persists, contact the developer on GitHub https://github.com/cursedgabo/ with the following error message: ${selector}`));
            else setTimeout(checkElement, 500);
        };
        checkElement();
    });
}

async function handleBlockUserFlow(win, userName) {
    const actionButton = await waitForElement(win, CONFIG.SELECTORS.ACTION_BUTTON);
    actionButton.click();
    await new Promise(r => setTimeout(r, CONFIG.TIMING.MENU_DELAY));

    const unblockLink = win.document.querySelector(CONFIG.SELECTORS.UNBLOCK_LINK);
    if (unblockLink) {
        logHelper.warning(`User ${userName} is already blocked`);
        win.close();
        return false;
    }

    const blockLink = await waitForElement(win, CONFIG.SELECTORS.BLOCK_LINK);
    blockLink.click();
    await new Promise(r => setTimeout(r, CONFIG.TIMING.MENU_DELAY));

    const confirmButton = await waitForElement(win, CONFIG.SELECTORS.CONFIRM_BUTTON);
    confirmButton.click();
    
    logHelper.success(`User ${userName} was successfully blocked`);
    await new Promise(r => setTimeout(r, CONFIG.TIMING.MODAL_DELAY));
    
    return true;
}

async function processUserInWindow(win, userName) {
    try {
        await new Promise(r => setTimeout(r, CONFIG.TIMING.PAGE_LOAD));
        const result = await handleBlockUserFlow(win, userName);
        win.close();
        return result;
    } catch (error) {
        logHelper.error(`Failed to block user ${userName}: ${error.message}`);
        try { win.close(); } catch (e) { }
        return false;
    }
}

async function manageSteamFriends() {
    if (!window.location.href.includes('/friends')) {
        alert('This script must be run on the Steam friends page. Go to the friend list of the person and run the script there.');
        return;
    }

    const profileNameElement = document.querySelector(CONFIG.SELECTORS.PROFILE_NAME);
    if (!profileNameElement) {
        logHelper.error('Could not retrieve profile information (The profile might be private or there might be an issue with the Steam API. Contact the developer on Github if the issue persists https://github.com/cursedgabo/).');
        return;
    }

    const profileName = profileNameElement.innerText.trim();
    const steamID64 = window.location.pathname.split('/')[2];

    const friends = Array.from(document.querySelectorAll(CONFIG.SELECTORS.FRIEND_ELEMENTS)).map(el => ({
        name: el.querySelector(CONFIG.SELECTORS.FRIEND_NAME)?.innerText.trim() || 'Unknown',
        steamId: el.getAttribute('data-steamid'),
        profileUrl: `https://steamcommunity.com/profiles/${el.getAttribute('data-steamid')}`
    }));

    if (friends.length === 0) {
        alert('No friends found in the friend list (This might be an issue with the Steam API. Try again later or contact the developer if the issue persists) (GitHub https://github.com/cursedgabo/SteamFriendsBlocker).');
        return;
    }

    logHelper.info(`Analyzing friends of ${profileName} (${steamID64})`);
    logHelper.success(`Found ${friends.length} friends:`);
    friends.forEach(friend => logHelper.default(`- ${friend.name} (${friend.steamId})`));

    if (!confirm(`Do you want to block ${friends.length} friends of ${profileName} (${steamID64})?\n\nNotes: Ensure you do not close this tab until all friends are blocked.\n\nMake sure to allow pop-ups for the script to work correctly (If unsure, check the GitHub page) (GitHub https://github.com/cursedgabo/SteamFriendsBlocker).`)) {
        logHelper.error('Operation Canceled');
        return;
    }

    let processed = 0;
    for (const friend of friends) {
        processed++;
        logHelper.info(`Blocking ${processed}/${friends.length} friends of ${profileName}`);
        
        try {
            const win = window.open(friend.profileUrl, '_blank');
            if (!win) throw new Error('Pop-up blocker detected. Please allow pop-ups in your browser to use the script (If unsure, check the GitHub page) (GitHub https://github.com/cursedgabo/SteamFriendsBlocker).');

            await processUserInWindow(win, friend.name);
            
            const delay = Math.floor(Math.random() * (CONFIG.TIMING.MAX_DELAY - CONFIG.TIMING.MIN_DELAY + 1)) + CONFIG.TIMING.MIN_DELAY;
            logHelper.info(`Waiting ${delay/1000} seconds...\n`);
            await new Promise(r => setTimeout(r, delay));
            
        } catch (error) {
            logHelper.error(`Error blocking ${friend.name}: ${error.message}`);
        }
    }

    logHelper.success(`Process completed successfully. All ${friends.length} friends of ${profileName} have been blocked.\n\nThank you for using Steam Friends Blocker by cursedgabo! (GitHub https://github.com/cursedgabo/SteamFriendsBlocker)`);
    alert(`Process completed successfully. All ${friends.length} friends of ${profileName} have been blocked.`);
}

manageSteamFriends().catch(error => logHelper.error(error.message));
