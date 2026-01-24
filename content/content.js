let hostname = window.location.hostname;
hostname = hostname.toLowerCase();
let platform = "";
//detecting platform on our own instead of taking permission from user
if(hostname.includes("netflix.com"))
{
    platform = "Netflix";
}
else if(hostname.includes("primevideo.com"))
{
    platform = "PrimeVideo";
}
else if(hostname.includes("hotstar.com") || hostname.includes("disneyplus.com"))
{
    platform = "Hotstar";
}

let title = "";
if(platform === "Netflix")
{
    title = getNetflixTitle();
}
else if(platform === "PrimeVideo")
{
    title = getPrimeVideoTitle();
}
else if(platform === "Hotstar")
{
    title = getHotstarTitle();
}

//getting title of series or movie in Netflix
function getNetflixTitle()
{
    title = document.querySelector(".title-logo");
    if(!title)
    {
        return null;
    }
    title = title.getAttribute("alt");
    return title || null;
}

/*As netfix is SPA, its DOM changes without reloading so we need to wait for title if its not present initially
so we are waiting using promise and detecting change in DOM using mutation Observer*/

function waitForNetflixTitle()
{
    return new Promise((resolve) => {
        //check initial title
        const newTitle = getNetflixTitle();
        if(newTitle)
        {
            resolve(newTitle);
            return;
        }

        //if DOM changes something
        const observer = new MutationObserver(() => {
            newTitle = getNetflixTitle();
            if(newTitle)
            {
                observer.disconnect();//stop observing
                resolve(newTitle);
            }
        });
        observer.observe(document.body,{
            childList: true,
            subtree: true
        });
    });
}