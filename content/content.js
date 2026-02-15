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
function injectRating(text) {
    if(document.querySelector("#imdb-rating")) return;
    if(document.querySelector("#episode-ratings")) return;
    const container = document.querySelector(".buttonControls--container");
    if(!container)
    {
        console.log("container not found");
        return;
    }
    const badge = document.createElement("div");
    badge.id = "imdb-rating";
    badge.innerText = text;
    badge.style.marginTop = "16px";
    badge.style.fontSize = "18px";
    badge.style.fontWeight = "600";
    badge.style.color = "#ffffffff";
    badge.style.display = "flex";
    badge.style.gap = "14px";
    badge.style.alignItems = "center";
    container.parentElement.appendChild(badge);
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
    const NetflixId = getNetflixId(url);
    if(!NetflixId) return;
    addImdb(NetflixId);
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
//firstly we will check if the data is in cache
//if it is found then we will inject the rating
//if not found then we will fetch the data from the api and inject the rating
//try and catch sequence it to avoid code breakout if any bug or network issue
async function addImdb(NetflixId)
{
    console.log("Adding imdb rating for netflix id:", NetflixId);
    const cache = getImdbCacheById(NetflixId);
    if(cache)
    {
        injectRating(`IMDb: ${cache.rating}   🍅${cache.rtScore || "N/A"}`);
        if(cache.episodes && cache.episodes.length)
        {
            injectEpisodesRatings(cache.episodes);
        }
        return;
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
            //fetch imdb data with title
            const searchurl = `https://www.omdbapi.com/?apikey=20bcd4d1&s=${encodeURIComponent(title)}`;
            console.log("Fetching imdb data for title:", title);
            const response = await fetch(searchurl);
            const data = await response.json();
            if(!data.Search || !data.Search.length)
            {
                console.log("No imdb results found");
                return;
            }
            const imdbId = data.Search[0].imdbID;
            //get full imdb data
            const imdburl = `https://www.omdbapi.com/?apikey=20bcd4d1&i=${imdbId}`;
            console.log("Fetching imdb data for imdb id:", imdbId);
            const response2 = await fetch(imdburl);
            const imdbdata = await response2.json();
            console.log("Imdb data:", imdbdata);
            const rating = imdbdata.imdbRating;
            const votes = imdbdata.imdbVotes;
            console.log("Rating:", rating);
            console.log("Votes:", votes);
            //rotten tomatoes score
            let rtScore = null;
            if(imdbdata.Ratings && imdbdata.Ratings.length)
            {
                const rtRating = imdbdata.Ratings.find(r => r.Source === "Rotten Tomatoes");
                if(rtRating)
                {
                    rtScore = rtRating.Value;
                }
            }
            let episodes = [];
            //checking for type
            if(imdbdata.Type === "series")
            {
                const totalSeasons = parseInt(imdbdata.totalSeasons);
                episodes = await fetchAllSeasons(imdbId, totalSeasons);
            }
            //storing imdb data in a object(it will store only relavent info from api data)
            const payload = {
                imdbId,
                rating,
                votes,
                rtScore,
                episodes,
                fetchedAt: Date.now()
            }
            saveImbdData(NetflixId, payload);
            injectRating(`IMDb: ${rating}  , 🍅${rtScore || "N/A"}`);
            if(episodes.length)
            {
                observeSeason(episodes);
            }
        }
        catch(error)
        {
            console.log("Error fetching imdb data:", error);
        }
    }
}
//fetch all seasons
async function fetchAllSeasons(imdbId, totalSeasons)
{
    const seasonPromise = [];
    for(let i = 1; i <= totalSeasons; i++)
    {
        const url = `https://www.omdbapi.com/?apikey=20bcd4d1&i=${imdbId}&Season=${i}`;
        seasonPromise.push(fetch(url).then(response => response.json()))
    }
    const seasonData = await Promise.all(seasonPromise);
    const allepisodes = [];
    seasonData.forEach((season, index) => {
        if(!season.Episodes) return;
        season.Episodes.forEach((ep) => {
            const rating = parseFloat(ep.imdbRating);
            if(!isNaN(rating)) allepisodes.push({
                season: index + 1,
                episode: parseInt(ep.Episode),
                rating
            })
        })
    })
    return allepisodes;
}
//get season data
async function getSeasonData(imdbId, seasonNumber)
{
    const url = `https://www.omdbapi.com/?apikey=20bcd4d1&i=${imdbId}&Season=${seasonNumber}`;
    const response = await fetch(url);
    const data = await response.json();
    if(!data.Episodes) return [];
    return data.Episodes.map(ep => ({
        season: seasonNumber,
        episode: parseInt(ep.Episode),
        title: ep.Title,
        rating: parseFloat(ep.imdbRating)
    }))
}
function getCurrentSeason()
{
    const season_label = document.querySelector('[data-uia="season-selector-dropdown"]');
    if(!season_label) return 1;
    const text = season_label.innerText;
    const match = text.match(/\d+/);
    if(match)
    {
        return parseInt(match[0]);
    }
    return 1;
}
function injectEpisodesRatings(episodes) {
    const episodeCards = document.querySelectorAll(
        ".titleCardList--container.episode-item"
    );
    if (!episodeCards.length) {
        console.log("No episode cards found yet");
        return;
    }
    episodeCards.forEach(card => {
        if (card.querySelector(".imdb-episode-rating")) return;

        const indexEl = card.querySelector(".titleCard-title_index");
        if (!indexEl) return;

        const episodeNumber = parseInt(indexEl.innerText.trim());
        const currentSeason = getCurrentSeason();
        const episodeData = episodes.find(ep => ep.season === currentSeason && ep.episode === episodeNumber);
        if (!episodeData) return;
        const titleWrapper = card.querySelector(".titleCardList-title");
        if (!titleWrapper) return;

        const ratingSpan = document.createElement("span");
        ratingSpan.className = "imdb-episode-rating";
        ratingSpan.innerText = ` ⭐ ${episodeData.rating}`;
        ratingSpan.style.marginLeft = "8px";
        ratingSpan.style.fontWeight = "600";
        ratingSpan.style.color = "#ffd700";

        titleWrapper.appendChild(ratingSpan);
    });
}
function observeSeason(episodes)
{
    const observer = new MutationObserver(() => {
        injectEpisodesRatings(episodes);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
