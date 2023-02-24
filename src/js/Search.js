const search = (text) => gapi.client
  .search.cse.list({
    "cx": "621f16476db5448ad",
    "q": text
  }).then(
    r => JSON.parse(r.body),
    e => console.error("Execute error", e)
  );

let loaded = false;
const loadClient = () => {
  if(loaded) return;
  loaded = !loaded;
  gapi.client.setApiKey("AIzaSyCvmdTnfUT0YQacBH1-bDMHYcc84UtrAGE");
  gapi.client.load("https://content.googleapis.com/discovery/v1/apis/customsearch/v1/rest")
    .then(
      function () { console.log("GAPI client loaded for API"); },
      function (err) { console.error("Error loading GAPI client for API", err); }
    );
}
document.body.addEventListener("pointerdown", loadClient);
gapi.load("client");
  // Make sure the client is loaded before calling this method.

export default search;