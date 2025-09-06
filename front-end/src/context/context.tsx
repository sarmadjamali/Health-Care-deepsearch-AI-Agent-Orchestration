"use client";   
import { useContext, useEffect, useState } from "react";
import { createContext } from "react";
import { useRouter } from "next/navigation";

type UserContextType = {
    checkUser: string;
    setCheckUser: (email: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);


export default function UserContextProvider({ children }: { children: React.ReactNode }) {
    const Router = useRouter();
    const [checkUser, setCheckUser] = useState<string>("");
    useEffect(() => {
        const storedEmail = localStorage.getItem("email");
        setCheckUser(storedEmail)
        Router.push(checkUser ? '/Dashboard' : '/login');
    }, [Router, checkUser]);

    return (
        <UserContext.Provider value= {{checkUser, setCheckUser}}>
    { children }
    </UserContext.Provider>
  );

}


export const userContext = () => useContext(UserContext);