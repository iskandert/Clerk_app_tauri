import { categoryStatusEnum, categoryTypeEnum } from '../constants';
import formatHelper from './formatHelper';
import typeHelper from './typeHelper';

function checkFields(data, fields) {
    const self = this;

    return (
        typeHelper.getIsObject(data) &&
        fields.every(field => {
            const isValid = self.validator[field](data[field]);
            // console.log('validate', field, data[field], isValid);

            return isValid;
        })
    );
}

const schemaHelper = {
    category: {
        validator: {
            _id: typeHelper.getIsString,
            name: typeHelper.getIsString,
            status: value => {
                return Object.values(categoryStatusEnum).includes(value);
            },
            type: value => {
                return Object.values(categoryTypeEnum).includes(value);
            },
            _updatedAt: typeHelper.getIsISORawDateString,
            _isEditable: typeHelper.getIsBooleanNumber,
            _isAccounted: typeHelper.getIsBooleanNumber,
        },
        editableFields: ['name', 'status', 'type'],
        checkEditableFields(data) {
            return checkFields.call(this, data, this.editableFields);
        },
    },
    action: {
        validator: {
            _id: typeHelper.getIsString,
            category_id: typeHelper.getIsString,
            sum: typeHelper.getIsPositiveNumber,
            date: typeHelper.getIsISODateString,
            comment: value => typeHelper.getIsString(value) || typeHelper.getIsNull(value),
            _updatedAt: typeHelper.getIsISORawDateString,
        },
        editableFields: ['category_id', 'sum', 'date', 'comment'],
        checkEditableFields(data) {
            return checkFields.call(this, data, this.editableFields);
        },
    },
    plan: {
        validator: {
            _id: typeHelper.getIsString,
            category_id: typeHelper.getIsString,
            sum: typeHelper.getIsPositiveNumber,
            date: typeHelper.getIsISOYearMonthString,
            comment: value => typeHelper.getIsString(value) || typeHelper.getIsNull(value),
            _updatedAt: typeHelper.getIsISORawDateString,
        },
        editableFields: ['category_id', 'sum', 'date', 'comment'],
        checkEditableFields(data) {
            return checkFields.call(this, data, this.editableFields);
        },
    },
    check: {
        validator: {
            date: typeHelper.getIsISODateString,
            default_sum: typeHelper.getIsNumber,
            savings_sum: typeHelper.getIsNumber,
            _updatedAt: typeHelper.getIsISORawDateString,
        },
        editableFields: ['date', 'default_sum', 'savings_sum'],
        checkEditableFields(data) {
            return checkFields.call(this, data, this.editableFields);
        },
    },
    config: {
        validator: {
            start_default_sum: typeHelper.getIsNumber,
            start_savings_sum: typeHelper.getIsNumber,
            field: typeHelper.getIsString,
        },
        startFields: ['start_default_sum', 'start_savings_sum'],
        checkStartFields(data) {
            return checkFields.call(this, data, this.startFields);
        },
    },
};

export default schemaHelper;
