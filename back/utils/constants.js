const displayFieldsLogs = ['action', 'schema_name', 'table_name', 'session_user_name', 'client_addr', 'client_port', 'application_name',
    'transaction_id', 'action_stamp_tx', 'changed_fields', 'row_pk_id']
const displayFieldsUsers = ['users_id', 'access_group_name', 'access_group', 'username', 'first_name', 'last_name', 'middle_name', 'email', 'phone', 'is_active']
const displayInfoUsers = ['users_id', 'username', 'access_group', 'first_name', 'last_name', 'middle_name', 'email', 'phone', 'is_active', 'ip_address']
const displayUserProfileFields = ['first_name', 'last_name', 'middle_name', 'email', 'phone', 'is_active', 'username']
const displayAccessGroupFields = ['id', 'access_group_name', 'info', 'enabled', 'create_date', 'editor_date', 'permission']
const displayBlackListFields = ['id', 'ip', 'create_date', 'agent', 'details']
const displayModuleFields = ['module_id', 'module', 'module_name', 'install_version', 'author', 'enabled', 'module_status', 'info', 'ord', 'schema_name', 'last_version', 'prev_version']
const displayRegistryFields = ['doct_id', 'title', 'enabled', 'module', 'info', 'name', 'ord']
const displayDebtorFields = ['id', 'name', 'date', 'non_residential_debt', 'residential_debt', 'land_debt', 'orenda_debt', 'identification', 'mpz']
const displayDistrictFields = ['id', 'name', 'date', 'non_residential_debt', 'residential_debt', 'land_debt', 'orenda_debt', 'identification', 'mpz','district','village']
const displayUtilitiesFields = ['payerident', 'fio', 'service', 'charge', 'adress'];
const displayKindergartenFields = ['id', 'child_name', 'date', 'group_number','kindergarten_name','debt_amount']
const displayKindergartenGroupsFields = ['id', 'kindergarten_name', 'group_name', 'group_type', 'created_at']
const displayRequisitesFilterFields = ['id', 'kved', 'iban', 'edrpou', 'service_group_id'];
const displayServicesFilterFields = ['id', 'name', 'unit', 'price', 'service_group_id'];
const displayBillsFilterFields = ['id', 'account_number', 'payer', 'service_id', 'quantity', 'total_price', 'status'];
const displayDebtChargesFields = ['id', 'tax_number', 'payer_name', 'payment_info','tax_classifier', 'account_number', 'full_document_id', 'document_date', 'delivery_date', 'cadastral_number', 'amount', 'status'];
const displayOwnerLogFields = ['id', 'date', 'name', 'chat_id', 'ip', 'source_display', 'formatted_date', 'search_year', 'search_month_name'];
const displayFieldsPhone = ['clientid', 'phone', 'hasNumber', 'isChecked'];

const allowedUserTableFilterFields = ['is_active', 'access_group']
const allowedLogTableFilterFields = ['action', 'uid', 'action_stamp_tx', 'access_group_id']
const allowedSecureLogTableFilterFields = ['action', 'uid', 'date_add', 'ip']
const allowedBlackListTableFilterFields = ['create_date', 'ip']
const allowedModuleTableFilterFields = ['module_name']
const allowedRegistryTableFilterFields = ['name', 'module']
const allowedDebtorTableFilterFields = ['identification','debt_amount','debt_amount_min','debt_amount_max','tax_type', 'only_debtors', 'districts','villages']
const allowedLocationsTableFilterFields = ['identification','name','district','village']
const allowedUtilitiesTableFilterFields = ['payerident', 'title', 'service']
const allowedKindergartenTableFilterFields = ['child_name']
const allowedKindergartenGroupsFilterFields = ['kindergarten_name', 'group_name', 'group_type']
const allowedRequisitesFilterFields = ['kved', 'iban', 'edrpou']; 
const allowedServicesFilterFields = ['name', 'unit'];
const allowedBillsFilterFields = ['account_number', 'payer', 'service_name', 'status'];
const allowedSortFields = ['id','name','identification','date', 'non_residential_debt','residential_debt','land_debt','orenda_debt', 'mpz', 'total_debt' ];
const allowedDebtChargesTableFilterFields = [ 'tax_number', 'payer_name', 'status', 'tax_classifier', 'amount_from', 'amount_to', 'date_from', 'date_to', 'delivery_date_from', 'delivery_date_to' ];
const allowedDebtChargesSortFields = ['id', 'tax_number', 'payer_name', 'document_date', 'delivery_date', 'amount', 'status', 'tax_classifier' ];
const allowedOwnerLogFields = ['name', 'dateFrom', 'dateTo', 'source', 'chat_id', 'ip'];
const allowedMessagesLogFilterFields = ['action_stamp_tx', 'access_group_id', 'username', 'uid'];
const allowedMessagesLogFields = ['dateFrom', 'dateTo', 'year', 'month', 'groupNumber', 'username', 'uid', 'action', 'periodType'];
const sortFieldsMapping = {
    'id': 'id',
    'name': 'name',
    'identification': 'identification',
    'date': 'date',
    'non_residential_debt': 'non_residential_debt',
    'residential_debt': 'residential_debt',
    'land_debt': 'land_debt', 
    'orenda_debt': 'orenda_debt',
    'mpz': 'mpz',
    'total_debt': '(COALESCE(non_residential_debt, 0) + COALESCE(residential_debt, 0) + COALESCE(land_debt, 0) + COALESCE(orenda_debt, 0) + COALESCE(mpz, 0))'
};

const allowInsertOrUpdateModuleFields = ['module', 'module_name', 'install_version', 'author', 'schema_name', 'info', 'enabled', 'ord', 'module_status', 'icon']
const allowInsertOrUpdateRegistryFields = ['title', 'enabled', 'module', 'info', 'name', 'ord']

const allowUserProfileUpdateFields = ['first_name', 'last_name', 'middle_name', 'email', 'phone', 'is_active', 'password']
const allowRoleUpdateFields = ['access_group_name', 'info', 'enabled', 'permission']
const allowBlackListUpdate = ['ip', 'details', 'agent']
const allowedDetailedLogFields = ['year', 'month','dateFrom','dateTo','groupNumber', 'periodType']

const itemsPerPage = [16, 32, 48];
const allowedAdminSearchLogFields = ['username', 'searched_person_name', 'search_result', 'year', 'month', 'client_addr', 'access_group_name', 'is_successful', 'date_from', 'date_to', 'is_active', 'payment_status', 'effective_only', 'date_from', 'date_to', 'is_active', 'payment_status', 'effective_only', 'date_from', 'date_to'];
const redisClientConfig = {
    password: process.env.REDIS_PASSWORD,
    ttl: process.env.REDIS_TTL || 60 * 60 * 1  //1hour
};
const cookieSettings = {
    httpOnly: true,
    maxAge: redisClientConfig.ttl,
    sameSite: 'strict',
    secure: true,
};

const allowedHeaders = ['Content-Type']
const exposedHeaders = ['Content-Disposition']

const accessLevel = {
    VIEW: 'VIEW',
    EDIT: 'EDIT',
    DELETE: 'DELETE',
    INSERT: 'INSERT',
}

const delayRequest = async (sec) => {
    if (typeof sec !== 'number') throw new Error('параметр min має бути числом')
    await new Promise(resolve => setTimeout(resolve, 1000 * sec))
}

const phoneReg = /^(\+?\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
const passwordReg = /^(?=.{8})(?=[^a-z]*[a-z])(?=[^A-Z]*[A-Z])(?=\D*\d)[a-zA-Z\d]+$/




const getSafeSortField = (fieldName) => {
    return sortFieldsMapping[fieldName] || 'name';
};
const validateSortDirection = (direction) => {
    const normalizedDirection = direction?.toLowerCase();
    return ['asc', 'desc'].includes(normalizedDirection) ? normalizedDirection : 'asc';
};

module.exports = {
    delayRequest,
    accessLevel,
    cookieSettings,
    redisClientConfig,
    allowedHeaders,
    exposedHeaders,
    displayFieldsUsers,
    displayInfoUsers,
    displayUserProfileFields,
    displayAccessGroupFields,
    displayBlackListFields,
    displayModuleFields,
    displayRegistryFields,
    displayDebtorFields,
    displayFieldsLogs,
    displayKindergartenFields,
    displayRequisitesFilterFields,
    displayServicesFilterFields,
    displayBillsFilterFields,
    allowedUserTableFilterFields,
    allowUserProfileUpdateFields,
    allowRoleUpdateFields,
    allowInsertOrUpdateModuleFields,
    allowInsertOrUpdateRegistryFields,
    allowedLogTableFilterFields,
    allowedSecureLogTableFilterFields,
    allowedBlackListTableFilterFields,
    allowedDebtorTableFilterFields,
    allowedRequisitesFilterFields,
    allowedServicesFilterFields,
    allowedBillsFilterFields,
    allowedKindergartenTableFilterFields,
    allowBlackListUpdate,
    allowedModuleTableFilterFields,
    allowedRegistryTableFilterFields,
    allowedDetailedLogFields,
    displayUtilitiesFields,
    allowedUtilitiesTableFilterFields,
    itemsPerPage,
    phoneReg,
    passwordReg,
    allowedSortFields,
    sortFieldsMapping,
    getSafeSortField,
    validateSortDirection,
    displayDebtChargesFields,
    allowedDebtChargesTableFilterFields,
    allowedDebtChargesSortFields,
    allowedAdminSearchLogFields,
    displayOwnerLogFields,
    allowedOwnerLogFields,
    displayDistrictFields,
    allowedLocationsTableFilterFields,
    allowedMessagesLogFilterFields,
    allowedMessagesLogFields,
    displayFieldsPhone,
    displayKindergartenGroupsFields,
    allowedKindergartenGroupsFilterFields,
}