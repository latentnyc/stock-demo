import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        const success = await login(credentialResponse.credential);
        if (success) {
            navigate('/portfolio');
        }
    };

    const handleError = () => {
        console.log('Login Failed');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <h2 className="text-2xl font-bold mb-6 text-gray-100">Sign in to Stock Demo</h2>
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="filled_black"
                shape="pill"
            />
        </div>
    );
};

export default Login;
