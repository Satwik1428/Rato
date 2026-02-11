//debug
console.log(" Content script loaded!");
console.log("Current URL:", window.location.href);

//platform detection
let hostname = window.location.hostname.toLowerCase();

if (hostname.includes("netflix.com")) {
    console.log(" Platform detected: Netflix");

    //netflix title extraction
    function isDetailPageNetflix() {
        return !!document.querySelector(".playerModel--player__storyArt");
    }

    function getNetflixTitle() {
        if (isDetailPageNetflix()) {
            const detailElement = document.querySelector(".playerModel--player__storyArt");
            if (detailElement) {
                return detailElement.getAttribute("alt") || null;
            }
        }
        let titleElement = document.querySelector(".previewModal--boxart");
        if (titleElement) {
            return titleElement.getAttribute("alt") || null;
        }

        titleElement = document.querySelector(".title-logo");
        if (titleElement) {
            return titleElement.getAttribute("alt") || null;
        }
        return null;
    }
    let lastNetflixTitle = null;
    function netflixTitleWatcher() {
        const observer = new MutationObserver(() => {
            const currentTitle = getNetflixTitle();
            if (currentTitle) {
                if (currentTitle != lastNetflixTitle) {
                    lastNetflixTitle = currentTitle;
                    console.log("Netflix title detected:", currentTitle);
                }
            } else {
                if (lastNetflixTitle !== null) {
                    lastNetflixTitle = null;
                    console.log("Netflix title not found");
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const initialTitle = getNetflixTitle();
    if (initialTitle && window.location.pathname.startsWith("/title/")) {
        console.log("Netflix title detected:", initialTitle);
    }
    if (window.location.pathname.startsWith("/title/")) {
        netflixTitleWatcher();
    }
}

function createTitleObject(netflix)
{
    return {
        netflix: {
            id: netflix.id,
            title: netflix.title,
            type: netflix.type,
            year: netflix.year || null,
            url: netflix.url
        },

        imdb: {
            id: null,
            rating: null,
            votes: null,
            genres: [],
            topEpisodes: []
        },

        rt: {
            tomatometer: null,
            audienceScore: null,
            topEpisodes: []
        }
    };
}

//store titles
function saveTitle(titleObj){
    const key = "netflix_titles";
    const existing = JSON.parse(localStorage.getItem(key)) || [];
    const dup = existing.some(t => t.netflix.id === titleObj.netflix.id);
    if(!dup)
    {
        existing.push(titleObj);
        localStorage.setItem(key, JSON.stringify(existing));
        console.log("Title saved:", titleObj.netflix.title);
    }
    else
    {
        console.log("Title already exists:", titleObj.netflix.title);
    }

}
//in above function we are saving the title to the local storage
//some will internally loop through existing array and check for duplicates
//now we need to fetch the title from the local storage
function getTitles(){
    const key = "netflix_titles";
    const existing = JSON.parse(localStorage.getItem(key)) || [];
    return existing;
}

function isNetflixDetailPage()
{
    if(window.location.pathname.startsWith("/title/"))
    {
        return true;
    }
    const params = new URLSearchParams(window.location.search);
    if(params.has("jbv"))
    {
        return true;
    }
    return false;
}
//match the title and store the netflix id on netflix.id
const url = window.location.href;
function getNetflixId(url)
{
    let matchid = url.match(/title\/(\d+)/);
    if(matchid)
    {
        return matchid[1];
    }
    //jvb case
    matchid = url.match(/jbv=(\d+)/);
    if(matchid)
    {
        return matchid[1];
    }
    return null;
}

const NetflixId = getNetflixId(url);
if(NetflixId)
{
    console.log("Netflix ID:", NetflixId);
}

//inject fake rating
function injectRating(rating) {
    if (document.querySelector("#imdb-rating")) return;
    const badge = document.createElement("div");
    badge.id = "imdb-rating";
    badge.innerText = `IMDb: ${rating}`;
    badge.style.color = "white";
    badge.style.fontSize = "16px";
    badge.style.fontWeight = "600";
    badge.style.marginTop = "10px";
    badge.style.zIndex = "9999";
    document.body.appendChild(badge);
}

function waitForDetailPage() {
    if (!isNetflixDetailPage()) return;
    if(!isDetailPageNetflix()) return;
    const id = getNetflixId(window.location.href);
    if (!id) return;
    console.log("Netflix ID (detail page):", id);
}
waitForDetailPage();
//since we cannot identify URL changes in netflix we use mutation observer to find the change in URL
//callback function is a function used as a parameter and we will call it when there is any change in URL
//while MutationObserver(check for chnages in DOM) is running it will check for the change in URL and call the callback function if there is any change

function onUrlChange(callback) {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            callback(currentUrl);
        }
    }).observe(document, { subtree: true, childList: true });
}

onUrlChange((url) => {
    console.log("URL changed to:", url);
    waitForDetailPage();
});
//caching of Imdb data
const IMDB_CACHE_KEY = "imdb_cache";
function getImdbCache(){
    return JSON.parse(localStorage.getItem(IMDB_CACHE_KEY)) || {};
}
function getImdbCacheById(NetflixId)
{
    const cache = getImdbCache();
    return cache[NetflixId] || null;
}
function saveImbdData(NetflixId, data)
{
    const cache = getImdbCache();
    cache[NetflixId] = data;
    localStorage.setItem(IMDB_CACHE_KEY, JSON.stringify(cache));
}
//get imdb id from netflix
function getCachedImdbRating(NetflixId)
{
    const cache = getImdbCacheById(NetflixId);
    if(cache)
    {
        return cache.rating;
    }
    return null;
}
const rating = getCachedImdbRating(NetflixId);
if(rating)
{
    injectRating(rating);
}
//unified function we add and get ratings
async function addImdb(NetflixId)
{
    const cache = getImdbCacheById(NetflixId);
    if(cache)
    {
        injectRating(cache.rating);
    }
    else
    {
        const title = getNetflixTitle();
        if(!title)
        {
            console.log("No title found");
            return;
        }
        try{
            const searchurl = `https://www.omdbapi.com/?apikey=20bcd4d1&s=${encodeURIComponent(title)}`;
            const response = await fetch(searchurl);
            const data = await response.json();
            if(!data.Search || !data.Search.length)
            {
                console.log("No imdb results found");
                return;
            }
            const imdbId = data.Search[0].imdbID;
        }
    }
}