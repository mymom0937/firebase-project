import { useEffect, useState } from "react";
import "./App.css";
import { Auth } from "./components/auth";
import { db, auth } from "./config/firebase";
import { getDocs, collection, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [movieList, setMovieList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("title-asc");
  const [filterOscar, setFilterOscar] = useState("all");
  const moviesCollectionRef = collection(db, "movies");
  const [user, setUser] = useState(null);
  
  // Track initial load to avoid showing errors right after login
  const [initialLoad, setInitialLoad] = useState(true);
  // Track successful form submissions
  const [formSubmissionSuccess, setFormSubmissionSuccess] = useState(false);
  // Track last operation for success message
  const [lastOperation, setLastOperation] = useState("add"); // "add", "update", "delete"

  // New Movies State
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieReleaseDate, setNewMovieReleaseDate] = useState("");
  const [newMovieReceivedAnOscar, setNewMovieReceivedAnOscar] = useState(false);
  const [newMovieGenre, setNewMovieGenre] = useState("");
  const [newMovieDirector, setNewMovieDirector] = useState("");
  const [newMovieRating, setNewMovieRating] = useState(0);
  const [newMoviePoster, setNewMoviePoster] = useState("");

  // Update Movie State
  const [updateMovieId, setUpdateMovieId] = useState(null);
  const [updateMovieTitle, setUpdateMovieTitle] = useState("");
  const [updateMovieReleaseDate, setUpdateMovieReleaseDate] = useState("");
  const [updateMovieReceivedAnOscar, setUpdateMovieReceivedAnOscar] = useState(false);
  const [updateMovieGenre, setUpdateMovieGenre] = useState("");
  const [updateMovieDirector, setUpdateMovieDirector] = useState("");
  const [updateMovieRating, setUpdateMovieRating] = useState(0);
  const [updateMoviePoster, setUpdateMoviePoster] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  const getMoviesList = async () => {
    if (!user) {
      return; // Don't try to fetch if no user is logged in
    }
    
    setLoading(true);
    // Only clear existing errors if this isn't the initial load after login
    // and don't clear errors during getMoviesList if we just had a successful form submission
    if (!initialLoad && !formSubmissionSuccess) {
      setError(null);
    }

    try {
      // Create query based on sort order and filters
      let movieQuery = moviesCollectionRef;
      
      // Always filter by current user
      movieQuery = query(movieQuery, where("userId", "==", user.uid));
      
      // Apply sorting
      if (sortOrder === "title-asc") {
        movieQuery = query(movieQuery, orderBy("title", "asc"));
      } else if (sortOrder === "title-desc") {
        movieQuery = query(movieQuery, orderBy("title", "desc"));
      } else if (sortOrder === "date-asc") {
        movieQuery = query(movieQuery, orderBy("releaseDate", "asc"));
      } else if (sortOrder === "date-desc") {
        movieQuery = query(movieQuery, orderBy("releaseDate", "desc"));
      } else if (sortOrder === "rating-desc") {
        movieQuery = query(movieQuery, orderBy("rating", "desc"));
      }
      
      // Fetching movies from Firestore
      const data = await getDocs(movieQuery);
      let filteredData = data.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      
      // Client-side filtering by Oscar status
      if (filterOscar !== "all") {
        const oscarStatus = filterOscar === "yes";
        filteredData = filteredData.filter(movie => movie.receivedAnOscar === oscarStatus);
      }
      
      // Client-side search
      if (searchTerm) {
        filteredData = filteredData.filter(movie => 
          movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (movie.genre && movie.genre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (movie.director && movie.director.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setMovieList(filteredData);
      // Clear any existing errors on successful fetch
      setError(null);
    } catch (error) {
      handleFirestoreError(error);
      // Don't set error if this is the first load after login or we just successfully submitted a form
      if (!initialLoad && !formSubmissionSuccess) {
        setError("Failed to load movies. Please try again later.");
      }
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
      // Reset form submission success flag
      if (formSubmissionSuccess) {
        setFormSubmissionSuccess(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Reset initialLoad to true when user signs in
        setInitialLoad(true);
        // Clear any existing errors when signing in
        setError(null);
        getMoviesList();
      } else {
        setMovieList([]);
      }
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Skip fetching if initialLoad is true (initial auth state change will handle the first fetch)
    if (user && !initialLoad) {
      getMoviesList();
    }
  }, [sortOrder, filterOscar, searchTerm, user]);

  // Effect to clear success message after a delay
  useEffect(() => {
    if (formSubmissionSuccess) {
      const timer = setTimeout(() => {
        setFormSubmissionSuccess(false);
      }, 5000); // 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [formSubmissionSuccess]);

  const validateMovieForm = () => {
    if (!newMovieTitle.trim()) return "Movie title is required";
    if (!newMovieReleaseDate) return "Release date is required";
    return null;
  };

  const onSubmitMovie = async (e) => {
    e.preventDefault();
    
    const validationError = validateMovieForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Make sure we have a valid user
    if (!user || !user.uid) {
      setError("You need to be signed in to add a movie. Please sign in and try again.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Adding movie to Firestore with user ID:", user.uid);
      
      // Prepare the movie data
      const movieData = {
        title: newMovieTitle,
        releaseDate: parseInt(newMovieReleaseDate),
        receivedAnOscar: newMovieReceivedAnOscar,
        genre: newMovieGenre,
        director: newMovieDirector,
        rating: newMovieRating,
        poster: newMoviePoster,
        userId: user.uid,
        createdAt: new Date().getTime(),
      };
      
      console.log("Movie data to be submitted:", movieData);
      
      // Add the document to Firestore
      const docRef = await addDoc(moviesCollectionRef, movieData);
      console.log("Document added with ID:", docRef.id);
      
      // Reset form
      setNewMovieTitle("");
      setNewMovieReleaseDate("");
      setNewMovieReceivedAnOscar(false);
      setNewMovieGenre("");
      setNewMovieDirector("");
      setNewMovieRating(0);
      setNewMoviePoster("");

      // Clear any previous errors
      setError(null);
      
      // Mark form submission as successful
      setFormSubmissionSuccess(true);
      setLastOperation("add");
      
      // Add the new movie to the local state directly instead of refetching
      const newMovie = {
        ...movieData,
        id: docRef.id
      };
      
      setMovieList(prev => {
        const updatedList = [...prev, newMovie];
        
        // Apply current sorting
        if (sortOrder === "title-asc") {
          return updatedList.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortOrder === "title-desc") {
          return updatedList.sort((a, b) => b.title.localeCompare(a.title));
        } else if (sortOrder === "date-asc") {
          return updatedList.sort((a, b) => a.releaseDate - b.releaseDate);
        } else if (sortOrder === "date-desc") {
          return updatedList.sort((a, b) => b.releaseDate - a.releaseDate);
        } else if (sortOrder === "rating-desc") {
          return updatedList.sort((a, b) => b.rating - a.rating);
        }
        
        return updatedList;
      });
      
      console.log("Movie added successfully and list updated locally");
    } catch (error) {
      error = handleFirestoreError(error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // More user-friendly error messages based on Firebase error codes
      if (error.code === 'permission-denied') {
        setError("Permission denied. Make sure you're signed in and have permissions to add movies.");
      } else if (error.code === 'unavailable') {
        setError("Firebase service is currently unavailable. Please try again later.");
      } else if (error.message && error.message.includes('index')) {
        setError("Database index error. Please try again later.");
        // Log the index creation URL to the console
        console.warn("This error might require creating an index in your Firestore database.");
      } else {
        setError(`Failed to add movie: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteMovie = async (id) => {
    if (!window.confirm("Are you sure you want to delete this movie?")) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const movieDoc = doc(db, "movies", id);
      await deleteDoc(movieDoc);
      
      // Mark operation as successful
      setFormSubmissionSuccess(true);
      setLastOperation("delete");
      
      // Update local state directly instead of refetching
      setMovieList(prev => prev.filter(movie => movie.id !== id));
      
      console.log("Movie deleted successfully");
    } catch (error) {
      error = handleFirestoreError(error);
      console.error("Error deleting movie:", error);
      
      // More user-friendly error messages based on Firebase error codes
      if (error.code === 'permission-denied') {
        setError("Permission denied. Make sure you're signed in and have permissions to delete this movie.");
      } else if (error.code === 'unavailable') {
        setError("Firebase service is currently unavailable. Please try again later.");
      } else {
        setError(`Failed to delete movie: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (movie) => {
    setUpdateMovieId(movie.id);
    setUpdateMovieTitle(movie.title);
    setUpdateMovieReleaseDate(movie.releaseDate);
    setUpdateMovieReceivedAnOscar(movie.receivedAnOscar);
    setUpdateMovieGenre(movie.genre || "");
    setUpdateMovieDirector(movie.director || "");
    setUpdateMovieRating(movie.rating || 0);
    setUpdateMoviePoster(movie.poster || "");
    setIsEditing(true);
  };
  
  const cancelEditing = () => {
    setUpdateMovieId(null);
    setUpdateMovieTitle("");
    setUpdateMovieReleaseDate("");
    setUpdateMovieReceivedAnOscar(false);
    setUpdateMovieGenre("");
    setUpdateMovieDirector("");
    setUpdateMovieRating(0);
    setUpdateMoviePoster("");
    setIsEditing(false);
  };

  const updateMovie = async (e) => {
    e.preventDefault();
    
    if (!updateMovieTitle.trim()) {
      setError("Movie title is required");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const movieDoc = doc(db, "movies", updateMovieId);
      
      // Create update data object
      const updatedData = {
        title: updateMovieTitle,
        releaseDate: parseInt(updateMovieReleaseDate),
        receivedAnOscar: updateMovieReceivedAnOscar,
        genre: updateMovieGenre,
        director: updateMovieDirector,
        rating: updateMovieRating,
        poster: updateMoviePoster
      };
      
      // Update document in Firestore
      await updateDoc(movieDoc, updatedData);
      
      // Mark form submission as successful
      setFormSubmissionSuccess(true);
      setLastOperation("update");
      
      // Clear any previous errors
      setError(null);
      
      // Update movie in local state directly instead of refetching
      setMovieList(prev => {
        return prev.map(movie => {
          if (movie.id === updateMovieId) {
            return {
              ...movie,
              ...updatedData
            };
          }
          return movie;
        });
      });
      
      // Exit edit mode
      cancelEditing();
      
      console.log("Movie updated successfully and list updated locally");
    } catch (error) {
      error = handleFirestoreError(error);
      console.error("Error updating movie:", error);
      
      // More user-friendly error messages based on Firebase error codes
      if (error.code === 'permission-denied') {
        setError("Permission denied. Make sure you're signed in and have permissions to update this movie.");
      } else if (error.code === 'unavailable') {
        setError("Firebase service is currently unavailable. Please try again later.");
      } else if (error.message && error.message.includes('index')) {
        setError("Database index error. Please try again later.");
      } else {
        setError(`Failed to update movie: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate star rating component
  const StarRating = ({ rating, setRating, editable = false }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i} 
          className={i <= rating/2 ? "star filled" : "star"} 
          onClick={() => editable && setRating(i * 2)}
          style={{ cursor: editable ? 'pointer' : 'default' }}
        >
          ★
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  // Helper function to handle Firestore errors and suggest index creation
  const handleFirestoreError = (error) => {
    console.error("Firestore error:", error);
    
    // Check if this is a missing index error
    if (error.message && error.message.includes('index')) {
      console.log("This appears to be an index error. You may need to create an index.");
      console.log("Error details:", error);
      
      // Extract the index creation URL if available
      const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s"]*/);
      if (indexUrlMatch) {
        console.log("Create the index by visiting this URL:", indexUrlMatch[0]);
      }
    }
    
    return error;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Movie Collection Manager</h1>
        <div className="auth-container">
          <Auth />
        </div>
      </header>

      {user ? (
        <>
          <div className="movie-controls">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-controls">
              <div className="sort-control">
                <label>Sort by:</label>
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="date-asc">Year (Oldest)</option>
                  <option value="date-desc">Year (Newest)</option>
                  <option value="rating-desc">Highest Rated</option>
                </select>
              </div>
              
              <div className="filter-control">
                <label>Oscar status:</label>
                <select 
                  value={filterOscar} 
                  onChange={(e) => setFilterOscar(e.target.value)}
                >
                  <option value="all">All movies</option>
                  <option value="yes">Oscar winners</option>
                  <option value="no">No Oscar</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="app-main">
            <div className="form-container">
              <h2>Add New Movie</h2>
              {/* Always show form submission errors, only hide initial load errors */}
              {error && <div className="error-message">{error}</div>}
              {formSubmissionSuccess && !error && (
                <div className="success-message">
                  {lastOperation === "add" && "Movie added successfully!"}
                  {lastOperation === "update" && "Movie updated successfully!"}
                  {lastOperation === "delete" && "Movie deleted successfully!"}
                </div>
              )}
              
              <form onSubmit={onSubmitMovie} className="movie-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Movie Title*</label>
                    <input
                      placeholder="Enter movie title"
                      type="text"
                      onChange={(e) => setNewMovieTitle(e.target.value)}
                      value={newMovieTitle}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Release Year*</label>
                    <input
                      placeholder="Enter release year"
                      type="number"
                      min="1900"
                      max="2099"
                      onChange={(e) => setNewMovieReleaseDate(e.target.value)}
                      value={newMovieReleaseDate}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Genre</label>
                    <input
                      placeholder="Enter movie genre"
                      type="text"
                      onChange={(e) => setNewMovieGenre(e.target.value)}
                      value={newMovieGenre}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Director</label>
                    <input
                      placeholder="Enter director's name"
                      type="text"
                      onChange={(e) => setNewMovieDirector(e.target.value)}
                      value={newMovieDirector}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Poster URL (optional)</label>
                  <input
                    placeholder="Enter poster image URL"
                    type="url"
                    onChange={(e) => setNewMoviePoster(e.target.value)}
                    value={newMoviePoster}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group rating-group">
                    <label>Rating</label>
                    <div className="rating-input">
                      <StarRating rating={newMovieRating} setRating={setNewMovieRating} editable={true} />
                      <span className="rating-text">{newMovieRating}/10</span>
                    </div>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <input
                      type="checkbox"
                      id="newMovieOscar"
                      onChange={(e) => setNewMovieReceivedAnOscar(e.target.checked)}
                      checked={newMovieReceivedAnOscar}
                    />
                    <label htmlFor="newMovieOscar">Received an Oscar</label>
                  </div>
                </div>
                
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Adding..." : "Add Movie"}
                </button>
              </form>
            </div>
            
            <div className="movie-list-container">
              <h2>Your Movie Collection</h2>
              
              {loading && <div className="loading">Loading movies...</div>}
              
              {!loading && movieList.length === 0 && !error && (
                <div className="no-movies">
                  <p>No movies found. Add your first movie!</p>
                </div>
              )}
              
              <div className="movie-grid">
                {movieList.map((movie) => (
                  <div key={movie.id} className={`movie-card ${movie.receivedAnOscar ? 'oscar-winner' : ''}`}>
                    {updateMovieId === movie.id ? (
                      <form onSubmit={updateMovie} className="movie-edit-form">
                        <div className="form-group">
                          <label>Title*</label>
                          <input
                            type="text"
                            value={updateMovieTitle}
                            onChange={(e) => setUpdateMovieTitle(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Release Year*</label>
                          <input
                            type="number"
                            min="1900"
                            max="2099"
                            value={updateMovieReleaseDate}
                            onChange={(e) => setUpdateMovieReleaseDate(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Genre</label>
                          <input
                            type="text"
                            value={updateMovieGenre}
                            onChange={(e) => setUpdateMovieGenre(e.target.value)}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Director</label>
                          <input
                            type="text"
                            value={updateMovieDirector}
                            onChange={(e) => setUpdateMovieDirector(e.target.value)}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Poster URL</label>
                          <input
                            type="url"
                            value={updateMoviePoster}
                            onChange={(e) => setUpdateMoviePoster(e.target.value)}
                          />
                        </div>
                        
                        <div className="form-group rating-group">
                          <label>Rating</label>
                          <div className="rating-input">
                            <StarRating rating={updateMovieRating} setRating={setUpdateMovieRating} editable={true} />
                            <span className="rating-text">{updateMovieRating}/10</span>
                          </div>
                        </div>
                        
                        <div className="form-group checkbox-group">
                          <input
                            type="checkbox"
                            id={`oscar-${movie.id}`}
                            checked={updateMovieReceivedAnOscar}
                            onChange={(e) => setUpdateMovieReceivedAnOscar(e.target.checked)}
                          />
                          <label htmlFor={`oscar-${movie.id}`}>Received an Oscar</label>
                        </div>
                        
                        <div className="edit-actions">
                          <button type="submit" className="save-btn" disabled={loading}>
                            {loading ? "Saving..." : "Save"}
                          </button>
                          <button 
                            type="button" 
                            className="cancel-btn" 
                            onClick={cancelEditing}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {movie.poster && (
                          <div className="movie-poster">
                            <img src={movie.poster} alt={`${movie.title} poster`} />
                            {movie.receivedAnOscar && <span className="oscar-badge">🏆</span>}
                          </div>
                        )}
                        
                        <div className={`movie-content ${!movie.poster ? 'no-poster' : ''}`}>
                          {!movie.poster && movie.receivedAnOscar && <span className="oscar-badge">🏆</span>}
                          <h3 className="movie-title">{movie.title}</h3>
                          
                          <div className="movie-details">
                            <p><strong>Year:</strong> {movie.releaseDate}</p>
                            {movie.genre && <p><strong>Genre:</strong> {movie.genre}</p>}
                            {movie.director && <p><strong>Director:</strong> {movie.director}</p>}
                            
                            {movie.rating > 0 && (
                              <div className="movie-rating">
                                <strong>Rating:</strong>
                                <StarRating rating={movie.rating} />
                                <span className="rating-text">{movie.rating}/10</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="movie-actions">
                            <button onClick={() => startEditing(movie)} className="edit-btn">
                              Edit
                            </button>
                            <button onClick={() => deleteMovie(movie.id)} className="delete-btn">
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="auth-required">
          <p>Please sign in to manage your movie collection</p>
        </div>
      )}
    </div>
  );
}

export default App;
