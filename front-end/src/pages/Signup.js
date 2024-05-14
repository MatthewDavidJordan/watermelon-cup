import React, { useRef, useState, useEffect } from "react"
import { Container, Form, Button, Card, Alert } from "react-bootstrap"
import { doCreateUserWithEmailAndPassword, doSignInWithGoogle } from "../firebase/auth";
import { Link, useNavigate } from "react-router-dom"
import { Navbar } from '../components/Navbar'

import { auth } from "../firebase/firebase";

export const Signup = () => {
  const emailRef = useRef()
  const passwordRef = useRef()
  const passwordConfirmRef = useRef()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match")
    }

    try {
      setError("")
      setLoading(true)
      await doCreateUserWithEmailAndPassword(emailRef.current.value, passwordRef.current.value)
      navigate("/")
    } catch {
      setError("Failed to create an account")
    }

    setLoading(false)
  }

  const onGoogleSignIn = (e) => {
    e.preventDefault();
    if (!loading) {
      setLoading(true);
      doSignInWithGoogle().catch((error) => {
        console.log(error.message);
        setError("Failed to sign in with google");
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in, navigate to the homepage
        navigate("/");
      }
    });

    // Clean up the observer on component unmount
    return () => unsubscribe();
  }, [navigate]);

  return (
    <Container
      className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
      style={{ minHeight: "100vh", maxWidth: "100%", padding: 0}}
    >
      <Navbar/>
      <div className="w-100" style={{ maxWidth: "400px" }}>
      <Card>
        <Card.Body>
          <h2 className="text-center mb-4">Sign Up</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group id="email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" ref={emailRef} placeholder="Email" required />
            </Form.Group>
            <Form.Group id="password">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" ref={passwordRef} placeholder="Password (>6 characters)"required />
            </Form.Group>
            <Form.Group id="password-confirm" className="mb-4">
              <Form.Label>Password Confirmation</Form.Label>
              <Form.Control type="password" ref={passwordConfirmRef} placeholder="Confirm Password"required />
            </Form.Group>
            <Button disabled={loading} className="w-100" type="submit">
              {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  <>Sign Up</>
              )}
            </Button>
            <hr className="my-4" />
            <Button disabled={loading} onClick={onGoogleSignIn} className="w-100" type="submit">
              {loading ? (
                <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
              ) : (
                <>Sign Up with Google</>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <div className="w-100 text-center mt-2">
        Already have an account? <Link to="/login">Log In</Link>
      </div>
    </div>
    </Container>
  )
}