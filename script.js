const KNOWN_LABELS = {
  "organic": "🌿 Organic",
  "bio": "🌱 Organic (Bio)",
  "fair-trade": "🤝 Fair Trade",
  "eu-organic": "🇪🇺 EU Organic",
  "vegan": "🌻 Vegan",
  "vegetarian": "🥦 Vegetarian",
  "gluten-free": "🚫🌾 Gluten-Free",
  "sustainable-fishing": "🐟 Sustainable Fishing",
  "rainforest-alliance": "🌳 Rainforest Alliance"
};

const EXPLANATIONS = {
  "a": "Product meets the highest standards for environmental sustainability and verified certifications.",
  "b": "Product is generally eco-friendly but may have one or more minor caveats.",
  "c": "Product is partially sustainable but improvements are possible in sourcing or labeling.",
  "d": "Product sustainability is questionable or limited.",
  "e": "This product is likely not eco-friendly; major environmental issues are flagged."
};

const scanBtn = document.getElementById('scan-btn');
const closeBtn = document.getElementById('close-scanner-btn');
const lookupBtn = document.getElementById('lookup-btn');
const shareBtn = document.getElementById('share-btn');

scanBtn?.addEventListener('click', () => {
  document.getElementById('scanner-box').classList.remove('hidden');
  closeBtn.classList.remove('hidden');
  startScanner();
});

closeBtn?.addEventListener('click', stopScanner);

lookupBtn?.addEventListener('click', () => {
  const code = document.getElementById('barcode-input').value.trim();
  if (code) lookupProduct(code);
});

function startScanner() {
  if (Quagga.initialized) {
    Quagga.start();
    return;
  }
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#scanner-box'),
      constraints: {
        facingMode: "environment",
        width: { min: 640 },
        height: { min: 480 }
      }
    },
    decoder: {
      readers: [
        "ean_reader",
        "ean_8_reader",
        "upc_reader",
        "upc_e_reader",
        "code_128_reader"
      ],
      multiple: false
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4
  }, function (err) {
    if (err) {
      console.error(err);
      alert("Camera init error.");
      return;
    }
    Quagga.initialized = true;
    Quagga.start();
  });

  Quagga.onDetected(onBarcodeDetected);
}

function stopScanner() {
  if (typeof Quagga.stop === "function") {
    Quagga.stop();
    Quagga.offDetected(onBarcodeDetected);
  }
  document.getElementById('scanner-box').classList.add('hidden');
  closeBtn.classList.add('hidden');
}

function onBarcodeDetected(data) {
  const code = data.codeResult.code;
  if (!code) return;

  stopScanner();
  document.getElementById('barcode-input').value = code;
  lookupProduct(code);
}

async function lookupProduct(barcode) {
  const resultBlock = document.getElementById('result');
  const badge = document.getElementById('eco-badge');
  const score = document.getElementById('eco-score');
  const details = document.getElementById('details');
  const labelChips = document.getElementById('eco-labels-chips');
  const explanation = document.getElementById('eco-explanation');

  try {
    resultBlock.classList.remove('hidden');
    badge.textContent = "";
    badge.className = "eco-badge";
    labelChips.innerHTML = "";
    explanation.textContent = "";

    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,ecoscore_grade,labels_tags,ingredients_text`);
    const data = await res.json();

    if (data.status !== 1 || !data.product) throw new Error("Not found");

    const product = data.product;
    const grade = product.ecoscore_grade || "e";
    const labelList = Array.isArray(product.labels_tags) ? product.labels_tags : [];

    const badgeMap = {
      "a": { text: "Verified Eco-Friendly", class: "eco-badge green", eco: "Green (Eco-Friendly)", color: "green" },
      "b": { text: "Partially Green", class: "eco-badge yellow", eco: "Yellow (Partially Sustainable)", color: "yellow" },
      "c": { text: "Partially Green", class: "eco-badge yellow", eco: "Yellow (Partially Sustainable)", color: "yellow" },
      "d": { text: "Not Eco-Friendly", class: "eco-badge red", eco: "Red (Not Sustainable)", color: "red" },
      "e": { text: "Not Eco-Friendly", class: "eco-badge red", eco: "Red (Not Sustainable)", color: "red" }
    };

    const badgeData = badgeMap[grade] || badgeMap["e"];

    badge.textContent = badgeData.text;
    badge.className = badgeData.class;
    score.textContent = badgeData.eco;
    score.className = badgeData.color;

    details.innerHTML = `
      <strong>Product:</strong> ${product.product_name || "Unknown"}<br>
      <strong>Brand:</strong> ${product.brands || "Unknown"}<br>
      <strong>Eco-Score:</strong> ${grade.toUpperCase()}<br>
      <strong>Ingredients:</strong> ${product.ingredients_text ? product.ingredients_text.slice(0, 60) + "..." : "N/A"}
    `;

    explanation.textContent = EXPLANATIONS[grade] || EXPLANATIONS["e"];

    labelChips.innerHTML = labelList.length
      ? labelList.map(label => KNOWN_LABELS[label] ? `<span class="eco-label-chip">${KNOWN_LABELS[label]}</span>` : '').join('')
      : `<span class="eco-label-chip">No certifications found</span>`;

  } catch (err) {
    badge.textContent = "Error";
    badge.className = "eco-badge red";
    score.textContent = "Fetch Failed";
    score.className = "red";
    details.innerHTML = "Could not load product data.";
    labelChips.innerHTML = "";
    explanation.textContent = "Try another barcode.";
  }
}

shareBtn?.addEventListener('click', async () => {
  const product = document.getElementById('details').innerText;
  const eco = document.getElementById('eco-score').innerText;
  const explanation = document.getElementById('eco-explanation').innerText;
  const text = `GreenScan Eco Check:\n${product}\nEco-Score: ${eco}\n${explanation}`;

  try {
    if (navigator.share) {
      await navigator.share({ text, title: "GreenScan Eco-Check" });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Eco-check result copied to clipboard.");
    }
  } catch {
    alert("Sharing failed. Please copy manually.");
  }
});