chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchImdb") {
        fetchImdbData(request.title).then(sendResponse).catch(error => {
            console.error("Error in fetchImdbData:", error);
            sendResponse({ error: error.message || "Failed to fetch IMDb data" });
        });
        return true; // Keep the message channel open for async response
    }
});

async function fetchImdbData(title) {
    const API_KEY = "20bcd4d1";
    
    // fetch imdb data with title
    const searchurl = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(title)}`;
    const response = await fetch(searchurl);
    const data = await response.json();
    
    if (!data.Search || !data.Search.length) {
        return { error: 'No imdb results found' };
    }
    
    const imdbId = data.Search[0].imdbID;
    
    // get full imdb data
    const imdburl = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbId}`;
    const response2 = await fetch(imdburl);
    const imdbdata = await response2.json();
    
    const rating = imdbdata.imdbRating;
    const votes = imdbdata.imdbVotes;
    
    let rtScore = null;
    if (imdbdata.Ratings && imdbdata.Ratings.length) {
        const rtRating = imdbdata.Ratings.find(r => r.Source === "Rotten Tomatoes");
        if (rtRating) {
            rtScore = rtRating.Value;
        }
    }
    
    return {
        imdbId,
        rating,
        votes,
        rtScore
    };
}
