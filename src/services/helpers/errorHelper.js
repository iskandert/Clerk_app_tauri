import { errorEnum } from '../constants';

const create = {
    notFound: () => ({ isNotFound: true }),
    validation: () => ({ isValidation: true }),
    internal: () => ({ isInternal: true }),
};

const getIsCustomError = error => {
    Object.keys(error).some(key => Object.values(errorEnum).includes(key));
};

const throwCustomOrInternal = error => {
    if (!errorHelper.getIsCustomError(error)) {
        error = create.internal();
    }
    throw error;
};

const throwOnNotEditable = record => {
    if (!record._isEditable) {
        throw create.validation();
    }
};

const errorHelper = {
    create,
    getIsCustomError,
    throwCustomOrInternal,
    throwOnNotEditable,
};

export default errorHelper;
