// Remove stars JS
        // function createStars() { ... }
        // Pagination state
        const galleryPage = {
            planets: 1,
            galaxy: 1,
            customResults: 1
        };

        // Gallery buffers for preloading
        const galleryBuffer = {
            planets: [],
            galaxy: [],
            customResults: []
        };
        const galleryIndex = {
            planets: 0,
            galaxy: 0,
            customResults: 0
        };

        // Fetch and display images with pagination
        async function fetchImages(query, containerId, sectionTitle = '', page = 1, append = false) {
            const container = document.getElementById(containerId);
            const apiUrl = `https://images-api.nasa.gov/search?q=${query}&media_type=image&page=${page}`;
            try {
                if (!append || page === 1) {
                    container.innerHTML = '<div class="loading">Loading images...</div>';
                }
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch images');
                const data = await response.json();
                const items = data.collection.items;
                if (items.length === 0) {
                    if (!append || page === 1) {
                        container.innerHTML = '<div class="error">No images found for this search.</div>';
                    }
                    return;
                }
                const gallery = items.slice(0, 8).map((item, index) => {
                    if (!item.links || item.links.length === 0) return '';
                    const imgUrl = item.links[0].href;
                    const title = item.data[0].title;
                    const imageId = `${containerId}_${(page-1)*8+index}`;
                    // Pass item data as a string and parse in showImageDetails
                    return `
                        <div class="imgs" onclick="showImageDetails('${imageId}', '${encodeURIComponent(JSON.stringify(item))}')">
                            <img src='${imgUrl}' alt='${title}' loading='lazy'>
                            <h3>${title}</h3>
                        </div>
                    `;
                }).filter(item => item !== '').join('');
                if (!append || page === 1) {
                    container.innerHTML = gallery;
                } else {
                    container.innerHTML += gallery;
                }
            } catch (error) {
                console.error('Error fetching images:', error);
                container.innerHTML = '<div class="error">Error loading images. Please try again later.</div>';
            }
        }

        // Fetch and buffer images in sets of 10
        async function bufferImages(query, containerId, startIndex = 0) {
            const apiUrl = `https://images-api.nasa.gov/search?q=${query}&media_type=image&page=${Math.floor(startIndex/100)+1}`;
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch images');
                const data = await response.json();
                const items = data.collection.items;
                // Flatten and filter valid images
                const validItems = items.filter(item => item.links && item.links.length > 0);
                // Buffer next 10 images
                galleryBuffer[containerId] = validItems.slice(startIndex % 100, (startIndex % 100) + 10);
            } catch (error) {
                galleryBuffer[containerId] = [];
            }
        }

        // Render images from buffer with scroll/fade effect
        function renderGallery(containerId, showIndex = 0) {
            const container = document.getElementById(containerId);
            container.classList.add('loading-transition');
            const images = galleryBuffer[containerId].slice(showIndex, showIndex + 5);
            const gallery = images.map((item, index) => {
                const imgUrl = item.links[0].href;
                const title = item.data[0].title;
                const imageId = `${containerId}_${showIndex+index}`;
                const delay = index * 0.1;
                return `
                    <div class="imgs" style="animation-delay: ${delay}s" onclick="showImageDetails('${imageId}', '${encodeURIComponent(JSON.stringify(item))}')">
                        <img src='${imgUrl}' alt='${title}' loading='lazy'>
                        <h3>${title}</h3>
                    </div>
                `;
            }).join('');
            container.innerHTML = gallery;
            setTimeout(() => {
                container.classList.remove('loading-transition');
                container.classList.add('loading-complete');
            }, 50);
            container.scrollTo({ left: 0, behavior: 'smooth' });
        }

        // Load initial images and preload next set
        async function loadInitialGallery(query, containerId) {
            galleryIndex[containerId] = 0;
            await bufferImages(query, containerId, 0);
            renderGallery(containerId, 0);
            // Preload next set
            bufferImages(query, containerId, 5);
        }

        // Next button logic
        function loadMoreImages(query, containerId) {
            if (galleryBuffer[containerId].length < 10) return; // No next set
            galleryIndex[containerId] += 5;
            renderGallery(containerId, 5);
            // Preload next set in background
            bufferImages(query, containerId, galleryIndex[containerId]+5);
        }

        // Previous button logic
        function loadPrevImages(query, containerId) {
            if (galleryIndex[containerId] === 0) return;
            galleryIndex[containerId] -= 5;
            renderGallery(containerId, 0);
            // Preload previous set if needed
            bufferImages(query, containerId, galleryIndex[containerId]);
        }

        // Show image details in modal
        function showImageDetails(imageId, itemStr) {
            const modal = document.getElementById('imageModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalImage = document.getElementById('modalImage');
            const modalDetails = document.getElementById('modalDetails');
            // Parse item data from string
            const item = JSON.parse(decodeURIComponent(itemStr));
            modalTitle.innerText = item.data[0].title;
            modalImage.src = item.links[0].href;
            modalDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${item.data[0].description || 'No description available'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${new Date(item.data[0].date_created).toLocaleDateString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Photographer:</span>
                    <span class="detail-value">${item.data[0].photographer || 'NASA'}</span>
                </div>
            `;

            modal.style.display = 'block';
        }

        // Close modal
        function closeModal() {
            const modal = document.getElementById('imageModal');
            modal.style.display = 'none';
        }

        // Custom search
        function performCustomSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            galleryIndex.customResults = 0;
            document.getElementById('customTitle').innerText = `🔍 Search Results for "${query}"`;
            document.getElementById('customSection').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loadInitialGallery(query, 'customResults');
        }

        // Quick search buttons
        function quickSearch(query) {
            document.getElementById('searchInput').value = query;
            performCustomSearch();
        }

        // Sidebar toggle JS
        function showsidebar(event) {
            event.preventDefault();
            document.getElementById('sidebar').classList.add('active');
        }
        function hidesidebar() {
            document.getElementById('sidebar').classList.remove('active');
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            // createStars();
            loadInitialGallery('earth', 'planets');
            loadInitialGallery('galaxy', 'galaxy');
            setTimeout(() => {
                addScrollEffects();
            }, 1000);
        });