import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        const success = await login(credentialResponse.credential);
        if (success) {
            navigate('/portfolio');
        }
    };

    const handleError = () => {

    };

    return (
        <div className="landing-container">
            {/* Background Effects */}
            <div className="landing-background">
                <div className="blob-1"></div>
                <div className="blob-2"></div>
            </div>

            <div className="landing-content">

                <h1 className="landing-title">
                    The Duck
                </h1>

                <p className="landing-quote">
                    "Calm on the surface, but paddling like hell underneath."
                </p>

                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={handleError}
                        useOneTap
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        width="300"
                    />
                </div>
            </div>

            <footer className="landing-footer">
                &copy; {new Date().getFullYear()} Latent. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
