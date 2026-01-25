//debug
console.log("🚀 Content script loaded!");
console.log("Current URL:", window.location.href);

//platform detection

let hostname = window.location.hostname.toLowerCase();
let platform = "";

if (hostname.includes("netflix.com")) {
    platform = "Netflix";
}
else if (hostname.includes("primevideo.com")) {
    platform = "PrimeVideo";
}
else if (hostname.includes("hotstar.com") || hostname.includes("disneyplus.com")) {
    platform = "Hotstar";
}

console.log(" Platform detected:", platform);



async function getTitle() {
    if (platform === "Netflix") {
        return await waitForNetflixTitle();
    }
    if (platform === "PrimeVideo") {
        return getPrimeVideoTitle();
    }
    if (platform === "Hotstar") {
        return null; // later
    }
    return null;
}

//netflix title extraction

function getNetflixTitle() {
    const titleElement = document.querySelector(".title-logo");
    if (!titleElement) return null;
    return titleElement.getAttribute("alt") || null;
}

function waitForNetflixTitle(timeout = 10000) {
    return new Promise((resolve) => {
        const initialTitle = getNetflixTitle();
        if (initialTitle) {
            resolve(initialTitle);
            return;
        }

        let timeoutId;

        const observer = new MutationObserver(() => {
            const newTitle = getNetflixTitle();
            if (newTitle) {
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(newTitle);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        timeoutId = setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}
//prime title extraction
function getPrimeVideoTitle(){
    let titleElement = document.querySelector('h1[data-automation-id="title"]');
    if(titleElement)
    {
        return titleElement.textContent.trim() || null;
    }

    titleElement = document.querySelector('h2[data-testid="title-art"]');
    if(titleElement)
    {
        return titleElement.getAttribute("aria-label") || null;

    }
    return null;
}

// Prime needs a CONTINUOUS watcher
let lastPrimeTitle = null;

function startPrimeTitleWatcher() {
    console.log("Prime title watcher started");

    const observer = new MutationObserver(() => {
        const currentTitle = getPrimeVideoTitle();

        if (currentTitle && currentTitle !== lastPrimeTitle) {
            lastPrimeTitle = currentTitle;
            console.log("Prime title detected:", currentTitle);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-label", "alt"]
    });
}


if (platform === "Netflix") {
    getTitle().then(title => {
        console.log("Netflix title:", title);
    });
}

if (platform === "PrimeVideo") {
    startPrimeTitleWatcher();
}
