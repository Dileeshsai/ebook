    
document.addEventListener("DOMContentLoaded", async function () {
    await loadBooks();
    updateSubscriptionButton();
    const token = localStorage.getItem('token');
    const loginLink = document.getElementById('loginLink');
    const profileLink = document.getElementById('profileLink');
    const logoutLink = document.getElementById('logoutLink');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileButton = document.querySelector('.profile-button');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (token) {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const userName = data.name || "User";
        const isSubscribed = data.isSubscribed;

        if (loginLink) loginLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
        if (usernameDisplay) usernameDisplay.textContent = userName; 
        if (profileDropdown) {
            profileDropdown.innerHTML = `
                <p>Welcome, ${userName}</p>
                <a href="#" id="logoutLink" onclick="logout()">Logout</a>
            `;
        }
    } else {
        if (loginLink) loginLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        if (profileDropdown) {
            profileDropdown.innerHTML = `<a href="#" id="loginLink" onclick="redirectToLogin()">Login</a>`;
        }
    }

    if (profileButton && profileDropdown) {
        profileButton.addEventListener('click', function (e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
    
        document.addEventListener("click", function (event) {
            if (profileDropdown && !event.target.closest('.profile')) {
                profileDropdown.classList.remove('active');
            }
        });
    }
});

// Handle the logout process
function logout() {
    // Remove token and user data from localStorage to log the user out
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('token');

    // Redirect to the shop page after logout
    window.location.href = 'shop.html';
}

// Redirect to login page
function redirectToLogin() {
    // Redirect the user to the login page
    window.location.href = 'login.html';
}

// Fetch and display user profile (optional for additional user data)
async function fetchUserProfile(token) {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const profileData = await response.json();
        console.log("User Profile Data:", profileData);
        // You can process user profile data if needed (e.g., display name or other details)
    } catch (error) {
        console.error("Error fetching user profile:", error);
        alert("Error fetching user profile.");
    }
}

        // Function to load books from the API
        async function loadBooks() {
            const apiUrl = "https://gutendex.com/books/";
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch books. Status: ${response.status}`);
                }
                const data = await response.json();
                const books = data.results.map((book) => ({
                    id: book.id,
                    title: book.title,
                    author: book.authors[0]?.name || "Unknown Author",
                    genre: book.subjects ? book.subjects.join(", ") : "General",
                    cover_image: book.formats["image/jpeg"] || 'placeholder.jpg',
                }));
                allBooks = books; // Save all books for filtering
                displayBooks(allBooks); // Display all books initially
            } catch (error) {
                console.error("Error fetching books:", error);
            }
        }
        function sanitize(str) {
    if (!str) return '';  // Fallback to empty string if the value is null or undefined
    return str.replace(/['"<>&]/g, function(match) {
        // Escape common special characters
        switch(match) {
            case "'": return "&#39;";
            case '"': return "&quot;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
        }
    });
}

        // Helper function to generate a random price between $5 and $25

        // Function to display books
        async function displayBooks(books) {
    const booksGrid = document.getElementById("books-grid");
    if (!booksGrid) return;

    booksGrid.innerHTML = ""; // Clear previous books
    const token = localStorage.getItem('token');
    let isSubscribed = false;
    let favorites = [];
    if (token) {
                // Fetch the user's subscription status
                favorites = await fetchLikedBooks();
                console.log("Fetched Liked Books:", favorites); // Debugging

                const response = await fetch('/api/user/status', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                isSubscribed = data.isSubscribed;
            }


    books.forEach((book) => {
        const isLiked = favorites.map(String).includes(String(book.id)); // Normalize ID comparison

        const bookCard = document.createElement("div");
        bookCard.classList.add("book-card");

        console.log("Rendering book:", book.id, "Liked:", isLiked); // Debugging log

        bookCard.innerHTML = `
            <div class="book-section">
                <img src="${book.cover_image}" alt="${book.title}" class="book-cover">
            </div>
            <div class="book-section">
                <h3 class="book-title">${book.title}</h3>
            </div>
            <div class="book-section">
                <p class="book-author">Author: ${book.author}</p>
            </div>
            <div class="book-section">
                <p class="book-genre">Genre: ${book.genre}</p>
            </div>
            
            <div class="button-container">
                                        ${isSubscribed ? `
                            <button class="view-button" onclick="viewBook(${book.id})">View Book</button>
                        ` : `
                            <button class="subscribe-button" onclick="handleSubscription('${book.title}', ${book.id})">Subscribe</button>
                        `}
                <button class="like-button" 
                    onclick="toggleFavorite(${book.id}, this)">
                    ${isLiked ? "Unlike" : "Like"}
                </button>
            </div>
            </div>
        `;
        booksGrid.appendChild(bookCard);
    });

    updateNavbarLikeCount();
}


        // Fetch liked books for the logged-in user
        async function fetchLikedBooks() {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log("No token found. User is not logged in.");
                return [];  // Return empty array if user is not logged in
            }
        
            try {
                const response = await fetch('/api/user/likes', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,  // Correct header format
                    },
                });
        
                // Check if the response is successful (status code 2xx)
                if (response.ok) {
                    const data = await response.json();
                    console.log('Fetched liked books:', data.likedBooks);
                    return data.likedBooks || []; // Return liked book IDs or an empty array if no liked books
                } else {
                    console.error('Error fetching liked books:', response.status, response.statusText);
                    if (response.status === 404) {
                        console.error('Route /api/user/likes not found. Ensure server is running and route is defined.');
                    }
                }
            } catch (error) {
                console.error('Error fetching liked books:', error.message || error);
            }
        
            return [];  // Return empty array on error or failure to fetch
        }
        
        


function filterByCategory(category) {
            const filteredBooks = allBooks.filter(book => {
                // Check if the book's genre contains the selected category
                return book.genre.toLowerCase().includes(category.toLowerCase());
            });
            displayBooks(filteredBooks); // Display the filtered books
        }
        function resetFilters() {
            displayBooks(allBooks); // Display all books again
        }
        function filterBooks() {
            const searchInput = document.getElementById('search').value.toLowerCase();
            const filteredBooks = allBooks.filter(book => {
                // Check if any of the book properties match the search input
                return (
                    book.title.toLowerCase().includes(searchInput) ||
                    book.author.toLowerCase().includes(searchInput) ||
                    book.genre.toLowerCase().includes(searchInput)
                );
            });
            displayBooks(filteredBooks); // Display the filtered books
        }
        // Function to toggle favorite books
// Toggle the favorite state of a book
async function toggleFavorite(bookId, button) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You need to log in to like a book.');
        return;
    }

    const isLiked = button.textContent === 'Unlike'; // Determine current button state
    const endpoint = isLiked ? '/api/user/unlike' : '/api/user/like';

    try {
        // Send like/unlike request to the server
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ bookId }), // Pass book ID to the backend
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log("API Response:", responseData);
            // Update button state immediately without waiting for reloading
            button.textContent = isLiked ? 'Like' : 'Unlike';

            // Optionally, fetch and log the updated favorites list
            const favorites = await fetchLikedBooks();
            console.log("Updated favorites:", favorites);
            updateNavbarLikeCount();

        } else {
            console.error(`Error toggling ${isLiked ? "unlike" : "like"}:`, response.statusText);
            alert("An error occurred. Please try again.");
        }
    } catch (error) {
        console.error(`Error toggling ${isLiked ? "unlike" : "like"}:`, error);
        alert("Failed to process your request. Please try again.");
    }
}


// Update the navbar's like count
async function updateNavbarLikeCount() {
    const likeCountElement = document.getElementById('like-count');
    const likedBooks = await fetchLikedBooks();
    if (likeCountElement) {
        likeCountElement.textContent = `Likes: ${likedBooks.length}`;
    }
}

        // Update the likes count

        async function updateLikesCount(bookId) {
    const likeCountElement = document.getElementById(`like-count-${bookId}`);
    if (likeCountElement) {
        try {
            const response = await fetch(`/api/user/likes`);
            if (response.ok) {
                const data = await response.json();
                const isLiked = data.likedBooks.includes(bookId);
                likeCountElement.textContent = isLiked ? 'Unlike' : 'Like';
            }
        } catch (error) {
            console.error("Error fetching like status:", error);
        }
    }
}

// Ensure this function updates the count in the navbar or relevant location


        

        // Handle the subscription process
        async function handleSubscription(bookTitle, bookId) {
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('token');
            if (!userId || !token) {
                console.error("User ID or Token missing!");
                alert("You must be logged in to subscribe.");
                return;
            }

            try {
                const response = await fetch("/api/subscribe", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userId: userId,
                        amount: 500
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error from server: ${response.statusText}`);
                }

                const data = await response.json();
                const order = data.order;

                if (!order) {
                    throw new Error('Failed to create order on server.');
                }

                const options = {
                    key: "rzp_test_hr66RzeUcyoNO7", // Replace with your Razorpay key
                    amount: 50000, // Amount in paise (500 INR)
                    currency: "INR",
                    name: "Book Haven",
                    description: bookTitle,
                    order_id: order.id,
                    handler: function (response) {
                        const userId = localStorage.getItem('userId');
                        const token = localStorage.getItem('token');
                        if (!userId || !token) {
                            console.error("User ID or Token missing!");
                            alert("User ID or Token is missing. Please log in again.");
                            return;
                        }

                        fetch("/api/payment/success", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                paymentId: response.razorpay_payment_id,
                                userId: userId,
                                amount: 500
                            })
                        })
                            .then(res => res.json())
                            .then(data => {
                                console.log("Subscription successful:", data);
                                alert("Subscription successful!");
                                updateSubscriptionButton();
                                window.location.reload();
                            })
                            .catch(error => {
                                console.error("Error during subscription:", error);
                                alert("Subscription failed. Please try again.");
                            });
                    }
                };

                const rzp1 = new Razorpay(options);
                rzp1.open();

            } catch (error) {
                console.error("Error creating Razorpay order:", error);
                alert("Something went wrong. Please try again.");
            }
        }

        function updateSubscriptionButton() {
            const token = localStorage.getItem('token');
            const subscribeButton = document.getElementById('subscribeButton');
            if (token && subscribeButton) {
                subscribeButton.style.display = 'none'; // Hide the subscribe button if logged in and subscribed
            }
        }

        function viewBook(bookId) {
            const url = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}-images.html`;
            window.location.href = url; // Navigate to the HTML version
        }

        // Fetch and display user profile
        async function fetchUserProfile(token) {
            try {
                const response = await fetch('/api/user/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const profileData = await response.json();
                console.log("User Profile Data:", profileData);
                // Process user profile data (e.g., display name)
            } catch (error) {
                console.error("Error fetching user profile:", error);
                alert("Error fetching user profile.");
            }
        }
