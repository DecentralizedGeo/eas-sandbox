// DOM Elements
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const urlInput = document.getElementById("urlInput");
const textInput = document.getElementById("textInput");
const chunkerSelect = document.getElementById("chunker");
const layoutSelect = document.getElementById("layout");
const resultCard = document.getElementById("resultCard");
const cidValue = document.getElementById("cidValue");
const resultDetails = document.getElementById("resultDetails");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");

// Advanced settings elements
const fixedChunkerSettings = document.getElementById("fixedChunkerSettings");
const rabinChunkerSettings = document.getElementById("rabinChunkerSettings");
const balancedLayoutSettings = document.getElementById(
  "balancedLayoutSettings"
);

let selectedFile = null;

// Tab switching
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;

    // Update tab buttons
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update tab contents
    tabContents.forEach((content) => {
      content.classList.remove("active");
      if (content.id === `${targetTab}-tab`) {
        content.classList.add("active");
      }
    });

    // Clear results when switching tabs
    hideResults();
  });
});

// Settings change handlers
chunkerSelect.addEventListener("change", () => {
  const chunkerType = chunkerSelect.value;
  if (chunkerType === "fixed") {
    fixedChunkerSettings.classList.remove("hidden");
    rabinChunkerSettings.classList.add("hidden");
  } else {
    fixedChunkerSettings.classList.add("hidden");
    rabinChunkerSettings.classList.remove("hidden");
  }
  onSettingsChange();
});

layoutSelect.addEventListener("change", () => {
  const layoutType = layoutSelect.value;
  if (layoutType === "balanced") {
    balancedLayoutSettings.classList.remove("hidden");
  } else {
    balancedLayoutSettings.classList.add("hidden");
  }
  onSettingsChange();
});

// Add event listeners for all settings that affect CID generation
document
  .getElementById("cidVersion")
  .addEventListener("change", onSettingsChange);
document
  .getElementById("chunkSize")
  .addEventListener("input", onSettingsChange);
document
  .getElementById("avgChunkSize")
  .addEventListener("input", onSettingsChange);
document
  .getElementById("minChunkSize")
  .addEventListener("input", onSettingsChange);
document
  .getElementById("maxChunkSize")
  .addEventListener("input", onSettingsChange);
document
  .getElementById("maxChildrenPerNode")
  .addEventListener("input", onSettingsChange);

// Function called when any setting changes
function onSettingsChange() {
  // Clear any existing results since settings have changed
  hideResults();

  // Check which tab is active and show appropriate feedback
  const activeTab = document.querySelector(".tab-button.active").dataset.tab;

  if (activeTab === "file" && selectedFile) {
    showSettingsChangedMessage(
      "generateFileCid",
      "Generate CID (Settings Changed)"
    );
  } else if (activeTab === "url" && urlInput.value.trim()) {
    showSettingsChangedMessage(
      "generateUrlCid",
      "Generate CID (Settings Changed)"
    );
  } else if (activeTab === "text" && textInput.value.trim()) {
    showSettingsChangedMessage(
      "generateTextCid",
      "Generate CID (Settings Changed)"
    );
  }
}

// Show a subtle message that settings have changed
function showSettingsChangedMessage(buttonId, newText) {
  const generateButton = document.getElementById(buttonId);
  if (generateButton) {
    generateButton.textContent = newText;
    generateButton.style.background = "#f6ad55"; // Orange color to indicate change

    // Reset the button text and color after clicking
    const resetButton = () => {
      generateButton.textContent = "Generate CID";
      generateButton.style.background = "#667eea";
      generateButton.removeEventListener("click", resetButton);
    };

    generateButton.addEventListener("click", resetButton, { once: true });
  }
}

// File drag and drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
});

// Only allow drop zone click to trigger file input if the click is not on the "Choose File" button
dropZone.addEventListener("click", (e) => {
  // Check if the click target is the "Choose File" button or its parent
  if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
    return; // Don't trigger file input, let the button handle it
  }
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

// File selection handler
function handleFileSelect(file) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileInfo.classList.remove("hidden");
  dropZone.style.display = "none";
  hideResults();
}

// Format file size
function formatFileSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

// Get current options from UI
function getCurrentOptions() {
  const chunkerType = chunkerSelect.value;
  const layoutType = layoutSelect.value;

  const options = {
    cidVersion: parseInt(document.getElementById("cidVersion").value),
    chunker: {
      type: chunkerType,
    },
    layout: {
      type: layoutType,
    },
  };

  // Debug: Log what we're sending
  console.log("Frontend sending options:", options);
  console.log(
    "CID Version:",
    options.cidVersion,
    "Type:",
    typeof options.cidVersion
  );

  // Add chunker-specific options
  if (chunkerType === "fixed") {
    options.chunker.options = {
      chunkSize: parseInt(document.getElementById("chunkSize").value),
    };
  } else if (chunkerType === "rabin") {
    options.chunker.options = {
      avgChunkSize: parseInt(document.getElementById("avgChunkSize").value),
      minChunkSize: parseInt(document.getElementById("minChunkSize").value),
      maxChunkSize: parseInt(document.getElementById("maxChunkSize").value),
    };
  }

  // Add layout-specific options
  if (layoutType === "balanced") {
    options.layout.options = {
      maxChildrenPerNode: parseInt(
        document.getElementById("maxChildrenPerNode").value
      ),
    };
  }

  return options;
}

// Show loading state
function showLoading() {
  hideResults();
  loading.classList.remove("hidden");
}

// Hide loading state
function hideLoading() {
  loading.classList.add("hidden");
}

// Show error
function showError(message) {
  hideLoading();
  errorMessage.textContent = message;
  error.classList.remove("hidden");
}

// Hide all results
function hideResults() {
  resultCard.classList.add("hidden");
  loading.classList.add("hidden");
  error.classList.add("hidden");
}

// Show results
function showResults(result) {
  hideLoading();
  cidValue.textContent = result.cid;

  // Build result details
  let details = "";
  if (result.filename) {
    details += `<p><strong>Filename:</strong> ${result.filename}</p>`;
  }
  if (result.size !== undefined) {
    details += `<p><strong>Size:</strong> ${formatFileSize(result.size)}</p>`;
  }
  if (result.url) {
    details += `<p><strong>Source URL:</strong> ${result.url}</p>`;
  }
  if (result.contentType) {
    details += `<p><strong>Content Type:</strong> ${result.contentType}</p>`;
  }
  if (result.textLength !== undefined) {
    details += `<p><strong>Text Length:</strong> ${result.textLength} characters</p>`;
  }

  // Add options used
  details += "<p><strong>Options Used:</strong></p>";
  details += `<p style="margin-left: 20px;">CID Version: ${
    result.options?.cidVersion !== undefined ? result.options.cidVersion : "N/A"
  }</p>`;

  resultDetails.innerHTML = details;
  resultCard.classList.remove("hidden");
}

// Copy CID to clipboard
document.getElementById("copyCid").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(cidValue.textContent);
    const button = document.getElementById("copyCid");
    const originalText = button.textContent;
    button.textContent = "✅";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
});

// Clear file selection
document.getElementById("clearFile").addEventListener("click", () => {
  resetFileSelection();
  hideResults();
});

// Generate CID from file
document
  .getElementById("generateFileCid")
  .addEventListener("click", async () => {
    if (!selectedFile) {
      showError("No file selected");
      return;
    }

    showLoading();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("options", JSON.stringify(getCurrentOptions()));

      const response = await fetch("/api/cid/file", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate CID");
      }

      showResults(result);
    } catch (err) {
      showError(err.message);
    }
  });

// Generate CID from URL
document
  .getElementById("generateUrlCid")
  .addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      showError("Please enter a URL");
      return;
    }

    showLoading();

    try {
      const response = await fetch("/api/cid/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          options: getCurrentOptions(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate CID");
      }

      showResults(result);
    } catch (err) {
      showError(err.message);
    }
  });

// Generate CID from text
document
  .getElementById("generateTextCid")
  .addEventListener("click", async () => {
    const text = textInput.value.trim();
    if (!text) {
      showError("Please enter some text");
      return;
    }

    showLoading();

    try {
      const response = await fetch("/api/cid/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          options: getCurrentOptions(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate CID");
      }

      showResults(result);
    } catch (err) {
      showError(err.message);
    }
  });

// Reset file selection
function resetFileSelection() {
  selectedFile = null;
  fileInfo.classList.add("hidden");
  dropZone.style.display = "block";
  fileInput.value = "";
}

// Add reset button functionality (if you add a reset button to the HTML)
document.addEventListener("DOMContentLoaded", () => {
  // Initialize advanced settings visibility
  chunkerSelect.dispatchEvent(new Event("change"));
  layoutSelect.dispatchEvent(new Event("change"));
});
