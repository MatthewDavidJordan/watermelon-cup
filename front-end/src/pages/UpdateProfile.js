import React, { useRef, useState } from "react"
import { Container, Form, Button, Card, Alert } from "react-bootstrap"
import { Link, useNavigate } from "react-router-dom"
import { Navbar } from '../components/Navbar'
import { updatePass, updateEmailAddress } from "../firebase/auth";
import { useAuth } from "../contexts/authContexts/firebaseAuth";

import { tailspin } from 'ldrs'

tailspin.register()

export const UpdateProfile = () => {
  const emailRef = useRef()
  const passwordRef = useRef()
  const passwordConfirmRef = useRef()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { currentUser } = useAuth()

  function handleSubmit(e) {
    e.preventDefault()
    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match")
    }

    const promises = []
    setLoading(true)
    setError("")

    if (emailRef.current.value !== currentUser.email) {
      promises.push(updateEmailAddress(emailRef.current.value))
    }
    if (passwordRef.current.value) {
      promises.push(updatePass(passwordRef.current.value))
    }

    Promise.all(promises)
      .then(() => {
        navigate("/")
      })
      .catch(() => {
        setError("Failed to update account")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Container
      className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
      style={{ minHeight: "100vh", maxWidth: "100%", padding: 0}}
    >
      <Navbar/>
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Update Profile</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group id="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  ref={emailRef}
                  required
                  defaultValue={currentUser.email}
                />
              </Form.Group>
              <Form.Group id="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  ref={passwordRef}
                  placeholder="Leave blank to keep the same"
                />
              </Form.Group>
              <Form.Group id="password-confirm" className="mb-4">
                <Form.Label>Password Confirmation</Form.Label>
                <Form.Control
                  type="password"
                  ref={passwordConfirmRef}
                  placeholder="Leave blank to keep the same"
                />
              </Form.Group>
              <Button disabled={loading} className="w-100" type="submit">
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  <>
                    Update
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          <Link to="/">Cancel</Link>
        </div>
      </div>
    </Container>
  )
}