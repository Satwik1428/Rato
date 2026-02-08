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
            subtree: true,
            attributes: true,
            attributeFilter: ["aria-label", "alt"]
        });
    }

    const initialTitle = getNetflixTitle();
    if (initialTitle) {
        console.log("Netflix title detected:", initialTitle);
    }
    netflixTitleWatcher();
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
//match the title and store the netflix id on netflix.id
const url = window.location.href;
function getNetflixId(url)
{
    const matchid = url.match(/title\/(\d+)/);
    if(matchid)
    {
        return matchid[1];
    }
    return null;
}

const id = getNetflixId(url);
if(id)
{
    console.log("Netflix ID:", id);
}
//add found id to netflix.id