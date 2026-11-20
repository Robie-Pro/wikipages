
const API = "https://en.wikipedia.org/w/api.php";

const searchInput = document.getElementById("search");
const results = document.getElementById("results");
const reader = document.getElementById("reader");
const statusText = document.getElementById("status");
const navigation = document.getElementById("navigation");
const sectionsContainer = document.getElementById("sections");
const backButton = document.getElementById("back");

let currentObserver = null;

async function api(params) {
    const url = API + "?" + new URLSearchParams({
        ...params,
        format: "json",
        origin: "*"
    });

    const response = await fetch(url);

    if (!response.ok) throw new Error("Request failed");

    return response.json();
}

async function searchWiki() {
    const query = searchInput.value.trim();

    if (!query) return;

    reader.style.display = "none";
    results.style.display = "block";
    results.innerHTML = "";
    backButton.style.display = "none";
    statusText.textContent = "Searching...";

    try {
        const data = await api({
            action: "query",
            list: "search",
            srsearch: query,
            srlimit: "15"
        });

        if (!data.query.search.length) {
            statusText.textContent = "No results found.";
            return;
        }

        statusText.textContent = "Search results";

        data.query.search.forEach(item => {
            const div = document.createElement("div");
            div.className = "result";

            const title = document.createElement("h3");
            title.textContent = item.title;

            const description = document.createElement("p");
            description.textContent = item.snippet.replace(/<[^>]*>/g, "");

            div.append(title, description);
            div.onclick = () => loadArticle(item.pageid);

            results.appendChild(div);
        });

    } catch (error) {
        statusText.textContent = "Unable to connect to Wikipedia.";
    }
}

function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll(
        "script, style, sup.reference, .mw-editsection, .reference"
    ).forEach(el => el.remove());

    doc.querySelectorAll("br").forEach(el => {
        el.replaceWith("\n");
    });

    doc.querySelectorAll("p, li, h2, h3, h4").forEach(el => {
        el.append("\n");
    });

    return doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim();
}

async function loadArticle(pageId) {
    results.style.display = "none";
    reader.style.display = "block";
    backButton.style.display = "inline-block";

    statusText.textContent = "Loading article...";
    document.getElementById("title").textContent = "";
    document.getElementById("introduction").textContent = "";
    navigation.innerHTML = "";
    sectionsContainer.innerHTML = "";

    try {
        const data = await api({
            action: "parse",
            pageid: pageId,
            prop: "sections"
        });

        const sections = data.parse.sections;

        const intro = await api({
            action: "parse",
            pageid: pageId,
            prop: "text",
            section: "0"
        });

        document.getElementById("title").textContent = data.parse.title;

        document.getElementById("introduction").textContent =
            htmlToText(intro.parse.text["*"]) || "No introduction available.";

        for (const section of sections) {
            if (section.index === "0") continue;

            const sectionData = await api({
                action: "parse",
                pageid: pageId,
                prop: "text",
                section: section.index
            });

            const text = htmlToText(sectionData.parse.text["*"]);

            if (!text) continue;

            displaySection(section, text);
        }

        setupObserver();

        statusText.textContent = "";

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        statusText.textContent = "Unable to load the full article.";
    }
}

function displaySection(section, text) {
    const id = "section-" + section.index;

    const link = document.createElement("a");
    link.textContent = section.line;
    link.href = "#" + id;

    link.onclick = event => {
        event.preventDefault();

        document.getElementById(id).scrollIntoView({
            behavior: "smooth"
        });
    };

    navigation.appendChild(link);

    const sectionElement = document.createElement("section");
    sectionElement.className = "section";
    sectionElement.id = id;

    const heading = document.createElement("h2");
    heading.textContent = section.line;

    const content = document.createElement("div");
    content.className = "section-text";
    content.textContent = text;

    sectionElement.append(heading, content);
    sectionsContainer.appendChild(sectionElement);
}

function setupObserver() {
    if (currentObserver) currentObserver.disconnect();

    currentObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            navigation.querySelectorAll("a").forEach(link => {
                link.classList.toggle(
                    "active",
                    link.getAttribute("href") === "#" + entry.target.id
                );
            });
        });
    }, {
        rootMargin: "-15% 0px -70% 0px"
    });

    document.querySelectorAll(".section").forEach(section => {
        currentObserver.observe(section);
    });
}

function goBack() {
    reader.style.display = "none";
    results.style.display = "block";
    backButton.style.display = "none";
    statusText.textContent = "Search results";

    if (currentObserver) currentObserver.disconnect();
}

document.getElementById("searchButton").addEventListener("click", searchWiki);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") searchWiki();
});

backButton.addEventListener("click", goBack);
