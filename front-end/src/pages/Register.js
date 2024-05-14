import React, { useRef, useState, useEffect } from "react"
import { Container, Form, Button, Card, Alert } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { Navbar } from '../components/Navbar'
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from "../firebase/firebase";

export const Register = () => {
  const firstNameRef = useRef()
  const lastNameRef = useRef()
  const nicknameRef = useRef()
  const emailRef = useRef()
  const phoneRef = useRef()
  const gradYearRef = useRef()
  const clubTeamRef = useRef()
  const footRef = useRef()
  const preferredPositionRef = useRef()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { currentUser, userLoggedIn } = useAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if the user is already registered
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().registered) {
          // User is already registered, navigate to the homepage
          navigate("/");
        } else {
          // User is not registered, proceed with the registration process
        }
      }
    });
  
    // Clean up the observer on component unmount
    return () => unsubscribe();
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setError("")
      setLoading(true)
      await addUserInfoToFirestore(e)
    } catch (error) {
      setError(error + "Failed to register account")
    }
    setLoading(false)
  }

  const addUserInfoToFirestore = async (e) => {
    e.preventDefault();
    if (userLoggedIn) {
      try {
        // Add user info to Firestore
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          firstName: firstNameRef.current.value,
          lastName: lastNameRef.current.value,
          nickname: nicknameRef.current.value,
          email: emailRef.current.value,
          phone: phoneRef.current.value,
          graduationYear: gradYearRef.current.value,
          clubTeam: clubTeamRef.current.value,
          footPref: footRef.current.value,
          position: preferredPositionRef.current.value,
          registered: true,
        });
        navigate("/");
      } catch (error) {
        setError("Error registering user");
      }
    }
  };

  return (
    <Container
      className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
      style={{ minHeight: "100vh", maxWidth: "100%", padding: 0}}
    >
      <Navbar/>
      <div className="w-100 mt-4 mb-4" style={{ maxWidth: "400px" }}>
      <Card>
        <Card.Body>
          <h2 className="text-center mb-4" style={{ padding: "0 20px" }}>Register for 2024 Watermelon Cup.</h2>
          <h3 className="text-center mb-4" style={{ fontSize: "18px", padding: "0 20px"}}>
            Games run every Sunday from 6-8pm from July 10 - August 7.
          </h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group id="firstName">
              <Form.Label>First Name</Form.Label>
              <Form.Control type="text" ref={firstNameRef} placeholder="First Name" required />
            </Form.Group>
            <Form.Group id="lastName">
              <Form.Label>Last Name</Form.Label>
              <Form.Control type="text" ref={lastNameRef} placeholder="Last Name" required />
            </Form.Group>
            <Form.Group id="nickname">
              <Form.Label>Nickname</Form.Label>
              <Form.Control type="text" ref={nicknameRef} placeholder="Nickname" defaultValue={currentUser.displayName || ""}required />
            </Form.Group>
            <Form.Group id="email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" ref={emailRef} placeholder="Email" defaultValue={currentUser.email}required />
            </Form.Group>
            <Form.Group id="phone">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control type="tel" ref={phoneRef} placeholder="Phone Number"required />
            </Form.Group>
            <Form.Group id="gradYear">
              <Form.Label>Staples Graduation Class</Form.Label>
              <Form.Select ref={gradYearRef} required>
                <option value="">Select Year</option>
                <option value="before2000">Before 2000</option>
                {/* Add options for each year from 2000 to 2028 */}
                {Array.from({ length: 29 }, (_, i) => (
                <option key={i + 2000} value={i + 2000}>
                    {i + 2000}
                </option>))}
                <option value="after2028">After 2028</option>
              </Form.Select>
            </Form.Group>
            <Form.Group id="clubTeam">
              <Form.Label>Club Team (if applicable)</Form.Label>
              <Form.Control type="text" ref={clubTeamRef} placeholder="Club Team"/>
            </Form.Group>
            <Form.Group id="footPref">
              <Form.Label>Preferred Foot</Form.Label>
              <Form.Select ref={footRef} required>
                <option value="">Select Option</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="both">Both</option>
              </Form.Select>
            </Form.Group>
            <Form.Group id="position" className="mb-4">
              <Form.Label>Preferred Position</Form.Label>
              <Form.Control type="text" ref={preferredPositionRef} placeholder="Preferred Position(s)"/>
            </Form.Group>
            <Button disabled={loading} className="w-100" type="submit">
              {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  <>Register</>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
    </Container>
  )
}