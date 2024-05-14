import React, { useRef, useState, useEffect } from "react"
import { Container, Form, Button, Card, Alert } from "react-bootstrap"
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from "../firebase/auth";
import { Link, useNavigate } from "react-router-dom"

import { auth } from "../firebase/firebase";
import { Navbar } from '../components/Navbar'

import { tailspin } from 'ldrs'

tailspin.register()

export const Login = () => {
  const emailRef = useRef()
  const passwordRef = useRef()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await doSignInWithEmailAndPassword(emailRef.current.value, passwordRef.current.value);
      navigate("/");
    } catch {
      setError("Failed to log in");
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
            <h2 className="text-center mb-4">Log In</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group id="email">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" ref={emailRef} placeholder="Email" required />
              </Form.Group>
              <Form.Group id="password" className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" ref={passwordRef} placeholder="Password"required />
              </Form.Group>
              <Button disabled={loading} className="w-100" type="submit">
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  <>
                    Log In
                  </>
                )}
              </Button>
              <hr className="my-4" />
              <Button onClick={onGoogleSignIn} disabled={loading} className="w-100" type="submit">
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  <>
                    Log In with Google
                  </>
                )}
              </Button>
            </Form>
            <div className="w-100 text-center mt-3">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          Need an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </Container>
  )
}