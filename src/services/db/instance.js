let db = null;

const getDBInstanse = () => db;

const setDBInstanse = value => (db = value);

export { getDBInstanse, setDBInstanse };
