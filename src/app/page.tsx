'use client';

import InputForm from '../components/InputForm';
import CardList from '../components/CardList';
import ClientAppWrapper from '../components/ClientAppWrapper';

export default function Home() {
    return (
        <>
            <ClientAppWrapper />
            <InputForm />
            <CardList />
        </>
    );
}
