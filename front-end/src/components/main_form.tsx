"use client";
import React, { use, useEffect, useState } from 'react';
import { Eye, EyeOff, Mail, Lock, UserCheck, Stethoscope, User, UserRound, UserCircle } from 'lucide-react';
import { Sign } from 'node:crypto';
import axios from 'axios';
import Link from 'next/link';
import { userContext } from '@/context/context';


type MainFormProps = {
    is_login?: boolean;
}

function MainForm({ is_login }: MainFormProps) {

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        isDoctor: false,
        name: ''
    });
    const {setCheckUser} = userContext()!;
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        const { email, password } = formData;
        let response;
        if (is_login) {
            let name = email.split('@')[0];
            setFormData(formData => ({ ...formData, name: name }));

            if (email && password) {
                response = await axios.post('http://127.0.0.1:8000/login', formData);
            }
        } else {
            if (email && password) {
                response = await axios.post('http://127.0.0.1:8000/signup', formData);
            }
        }
        if (response?.status === 200) {
            alert("Credentials saved successfully!");
            setCheckUser(email);
            localStorage.setItem("email", email);
            localStorage.setItem("isDoctor", formData.isDoctor ? "true" : "false");
        }

        else {
            alert("Please enter both email and password.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                        <UserCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Join our platform and get started today</p>
                </div>

                {/* Signup Form */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Role Selection */}
                        {!is_login &&
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">I am a:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, isDoctor: false }))}
                                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${!formData.isDoctor
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center space-y-2">
                                            <User className="w-6 h-6" />
                                            <span className="text-sm font-medium">Patient</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, isDoctor: true }))}
                                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${formData.isDoctor
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center space-y-2">
                                            <Stethoscope className="w-6 h-6" />
                                            <span className="text-sm font-medium">Doctor</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        }
                        {/* Email Field */}
                        {
                            !is_login &&
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                                Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserCircle className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'name' ? 'text-blue-500' : 'text-gray-400'
                                        }`} />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="name"
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>
                        }


                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'email' ? 'text-blue-500' : 'text-gray-400'
                                        }`} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'
                                        }`} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                                    placeholder="Create a strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl"
                        >
                        {is_login ? "Log In" : "Sign Up"}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        {!is_login ?
                            <p className="text-sm text-gray-600">
                                Already have an account?{' '}
                                <button className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
                                    <Link href="/signup">
                                        Log In
                                    </Link>
                                </button>
                            </p> :
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <button className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
                                    <Link href="/signup">
                                        Sign Up
                                    </Link>
                                </button>
                            </p>
                        }
                    </div>
                </div>

                {/* Terms */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        By creating an account, you agree to our{' '}
                        <button className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">
                            Terms of Service
                        </button>{' '}
                        and{' '}
                        <button className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">
                            Privacy Policy
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default MainForm;