import { use, useEffect, useState } from "react";
import "./App.css";
import { Auth } from "./components/auth";
import { db, auth } from "./config/firebase";
import { getDocs, collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

function App() {
  const [movieList, setMovieList] = useState([]);
  const moviesCollectionRef = collection(db, "movies");

  // New Movies State
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieReleaseDate, setNewMovieReleaseDate] = useState(0);
  const [newMovieReceivedAnOscar, setNewMovieReceivedAnOscar] = useState(false);

  // Title Update State
  const [updateMovieTitle, setUpdateMovieTitle] = useState("");

  const getMoviesList = async () => {
    try {
      // Fetching movies from Firestore
      const data = await getDocs(moviesCollectionRef);
      const filteredData = data.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      // console.log(filteredData);
      setMovieList(filteredData);
    } catch (error) {
      console.error("Error fetching movies: ", error);
    }
  };

  useEffect(() => {
    getMoviesList();
  }, []);

  const onSubmitMovie = async (e) => {
    try {
      await addDoc(moviesCollectionRef, {
        title: newMovieTitle,
        releaseDate:newMovieReleaseDate,
        receivedAnOscar: newMovieReceivedAnOscar,
        userId: auth?.currentUser?.uid,
      }); 
      // Reset form
      setNewMovieTitle("");
      setNewMovieReleaseDate(0);
      setNewMovieReceivedAnOscar(false);
      // Refresh the movie list
      await getMoviesList();
    } catch (error) {
      console.error("Error adding movie: ", error);
    }
  };

      const deleteMovie = async (id) => {
    const movieDoc = doc(db, "movies", id);
    await deleteDoc(movieDoc);
    await getMoviesList(); // Refresh the movie list
  };

  const updateMovie = async (id) => {
    const movieDoc = doc(db, "movies", id);
    await updateDoc(movieDoc, { title: updateMovieTitle });
    setUpdateMovieTitle(""); // Clear the input field
    await getMoviesList(); // Refresh the movie list
  };

  return (
    <div className="App">
      <Auth />

      <div>
        <input
          placeholder="Movies Title..."
          type="text"
          onChange={(e) => setNewMovieTitle(e.target.value)}
          value={newMovieTitle}
        />
        <input
          placeholder="releaseDate..."
          type="number"
          onChange={(e) => setNewMovieReleaseDate(e.target.value)}
          value={newMovieReleaseDate}
        />
        <input
          type="checkbox"
          onChange={(e) => setNewMovieReceivedAnOscar(e.target.checked)}
          value={newMovieReceivedAnOscar}
          placeholder="Received an Oscar"
          checked={newMovieReceivedAnOscar}
        />
        <label>Received an Oscar</label>
        <button onClick={onSubmitMovie}>Submit Movie</button>
      </div>

      <div>
        {movieList.map((movie) => (
          <div key={movie.id}>
            <h1
              style={{
                color: movie.receivedAnOscar ? "green" : "red",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              {movie.title}
            </h1>
            <p>Date:{movie.releaseDate}</p>
            <button onClick={() => deleteMovie(movie.id)}>Delete Movies</button>

            <input
              placeholder="Update Movie Title..."
              onChange={(e) => setUpdateMovieTitle(e.target.value)}
              value={updateMovieTitle}
            />
            <button onClick={() => updateMovie(movie.id)}>Update Movie</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
