const { 
    Paragraph, 
    TextRun, 
    patchDocument, 
    TableRow, 
    TableCell, 
    Table, 
    VerticalAlign, 
    HeadingLevel, 
    PatchType, 
    AlignmentType, 
    WidthType, 
    ExternalHyperlink, 
    ImageRun 
} = require('docx');

const { addRequisiteToLandDebt, addRequisiteToWaterDebt } = require('./function');
const { 
    territory_title, 
    territory_title_instrumental, 
    phone_number_GU_DPS, 
    GU_DPS_region,
    CURRENT_REGION, 
    website_name, 
    website_url, 
    telegram_name, 
    telegram_url, 
    debt_charge_account,
    GU_DPS_ADDRESS 
} = require('./communityConstants');

const fs = require('fs').promises;

// ==================== КОНСТАНТИ ==================== //
const CELL_WIDTH = {
    size: 750,
    type: WidthType.PERCENTAGE
};

const FONT_CONFIG = {
    family: "Times New Roman",
    sizes: {
        large: 26,
        medium: 24,
        small: 22,
        extraSmall: 20,
        tiny: 18
    }
};

// ==================== ДОПОМІЖНІ ФУНКЦІЇ ==================== //

/**
 * Створює рядки таблиці з масиву даних
 * @param {Array} body - Масив об'єктів з label та value
 * @returns {Array} Масив TableRow об'єктів
 */
const createTableRows = (body) => {
    if (!Array.isArray(body)) {
        console.warn("⚠️ createTableRows: body не є масивом");
        return [];
    }

    return body.map((item) => {
        return new TableRow({
            children: [
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: item?.label || '', 
                                    font: FONT_CONFIG.family, 
                                    size: FONT_CONFIG.sizes.large, 
                                    bold: true 
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        })
                    ],
                    width: CELL_WIDTH,
                    verticalAlign: 'center',
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: item?.value || '', 
                                    font: FONT_CONFIG.family, 
                                    size: FONT_CONFIG.sizes.large
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        })
                    ],
                    width: CELL_WIDTH,
                    verticalAlign: 'center',
                }),
            ],
        });
    });
};

/**
 * Створює параграф з текстом
 * @param {string} text - Текст параграфа
 * @param {Object} options - Опції форматування
 * @returns {Paragraph} Об'єкт параграфа
 */
const createParagraph = (text, options = {}) => {
    const {
        alignment = AlignmentType.LEFT,
        size = FONT_CONFIG.sizes.medium,
        bold = false,
        italics = false,
        color = null
    } = options;

    return new Paragraph({
        children: [
            new TextRun({ 
                text, 
                font: FONT_CONFIG.family, 
                size, 
                bold, 
                italics,
                color
            })
        ],
        alignment,
    });
};

/**
 * Створює гіперпосилання
 * @param {string} text - Текст посилання
 * @param {string} url - URL посилання
 * @param {Object} options - Опції форматування
 * @returns {ExternalHyperlink} Об'єкт гіперпосилання
 */
const createHyperlink = (text, url, options = {}) => {
    const { size = FONT_CONFIG.sizes.medium } = options;
    
    return new ExternalHyperlink({
        children: [
            new TextRun({
                text,
                font: FONT_CONFIG.family,
                size,
                color: "0000FF",
                underline: {}
            }),
        ],
        link: url,
    });
};

/**
 * Форматує дату у український формат
 * @param {Date|string} date - Дата для форматування
 * @param {boolean} longFormat - Використовувати довгий формат (з назвою місяця)
 * @returns {string} Відформатована дата
 */
const formatDate = (date, longFormat = true) => {
    try {
        const dateObj = new Date(date);
        const options = longFormat 
            ? { day: '2-digit', month: 'long', year: 'numeric' }
            : { day: '2-digit', month: '2-digit', year: 'numeric' };
        
        return new Intl.DateTimeFormat('uk-UA', options).format(dateObj);
    } catch (error) {
        console.warn("❗ Помилка форматування дати. Використовується поточна дата.");
        const options = longFormat 
            ? { day: '2-digit', month: 'long', year: 'numeric' }
            : { day: '2-digit', month: '2-digit', year: 'numeric' };
        
        return new Intl.DateTimeFormat('uk-UA', options).format(new Date());
    }
};

/**
 * Визначає тип податку на основі коду в різних полях
 * @param {Object} charge - Об'єкт нарахування
 * @returns {Object} Об'єкт з taxType та taxName
 */
const determineTaxType = (charge) => {
    // Збираємо всі поля, де може міститися код податку
    const fieldsToCheck = [
        charge.payment_info || '',
        charge.tax_classifier || '',
        charge.account_number || '',
        charge.full_document_id || '',
        JSON.stringify(charge)
    ].join(' ').toLowerCase();
    
    // Маппінг кодів до типів податків
    const taxCodes = {
        '18010900': { type: 'rent', name: 'оренди землі з фізичних осіб' },
        '18010700': { type: 'land', name: 'земельного податку з фізичних осіб' },
        '18010300': { type: 'non_residential', name: 'податку на нерухомість (не житлова) з фізичних осіб' },
        '18010200': { type: 'residential', name: 'податку на нерухомість (житлова) з фізичних осіб' },
        '11011300': { type: 'mpz', name: 'мінімального податкового зобов\'язання (МПЗ)' }
    };
    
    // Шукаємо відповідний код
    for (const [code, taxInfo] of Object.entries(taxCodes)) {
        if (fieldsToCheck.includes(code)) {
            return { taxType: taxInfo.type, taxName: taxInfo.name };
        }
    }
    
    // За замовчуванням - земельний податок
    return { 
        taxType: 'land', 
        taxName: 'земельного податку з фізичних осіб' 
    };
};

/**
 * Отримує реквізити для конкретного типу податку
 * @param {Object} settings - Налаштування з реквізитами
 * @param {string} taxType - Тип податку
 * @returns {Object|null} Об'єкт з реквізитами або null
 */
const getRequisitesForTaxType = (settings, taxType) => {
    if (!settings) return null;
    
    const requisiteMapping = {
        'non_residential': {
            purpose: 'non_residential_debt_purpose',
            account: 'non_residential_debt_account',
            edrpou: 'non_residential_debt_edrpou',
            recipientname: 'non_residential_debt_recipientname'
        },
        'residential': {
            purpose: 'residential_debt_purpose',
            account: 'residential_debt_account',
            edrpou: 'residential_debt_edrpou',
            recipientname: 'residential_debt_recipientname'
        },
        'land': {
            purpose: 'land_debt_purpose',
            account: 'land_debt_account',
            edrpou: 'land_debt_edrpou',
            recipientname: 'land_debt_recipientname'
        },
        'rent': {
            purpose: 'orenda_debt_purpose',
            account: 'orenda_debt_account',
            edrpou: 'orenda_debt_edrpou',
            recipientname: 'orenda_debt_recipientname'
        },
        'mpz': {
            purpose: 'mpz_purpose',
            account: 'mpz_account',
            edrpou: 'mpz_edrpou',
            recipientname: 'mpz_recipientname'
        }
    };
    
    const mapping = requisiteMapping[taxType] || requisiteMapping['land'];
    
    return {
        purpose: settings[mapping.purpose],
        account: settings[mapping.account],
        edrpou: settings[mapping.edrpou],
        recipientname: settings[mapping.recipientname]
    };
};

/**
 * Форматує призначення платежу
 * @param {Object} charge - Об'єкт нарахування
 * @param {Object} settings - Налаштування
 * @param {string} taxType - Тип податку
 * @returns {string} Відформатоване призначення платежу
 */
const formatPaymentPurpose = (charge, settings, taxType) => {
    const taxNumber = charge.tax_number || "НЕ ВКАЗАНО";
    const payerName = charge.payer_name?.toUpperCase() || "НЕ ВКАЗАНО";
    
    const settingsFields = {
        'non_residential': 'non_residential_debt_purpose',
        'residential': 'residential_debt_purpose',
        'land': 'land_debt_purpose',
        'rent': 'orenda_debt_purpose',
        'mpz': 'mpz_purpose'
    };
    
    const purposeField = settingsFields[taxType] || settingsFields['land'];
    let purpose = settings?.[purposeField] || `101;${taxNumber};18010700;${taxType} податок;`;
    
    // Замінюємо плейсхолдери
    purpose = purpose.replace(/#IPN#/g, `${taxNumber};${payerName}`);
    
    return purpose;
};

/**
 * Форматує суму заборгованості
 * @param {number|string} amount - Сума
 * @returns {string} Відформатована сума з валютою
 */
const formatDebtAmount = (amount) => {
    const numAmount = Number(amount) || 0;
    return numAmount.toFixed(2) + ' грн.';
};

/**
 * Конвертує число в українські слова
 * @param {number|string} amount - Сума для конвертації
 * @returns {string} Сума прописом
 */
const convertNumberToWords = (amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return 'нуль грн. 00 коп.';
    
    const grn = Math.floor(numAmount);
    const kop = Math.round((numAmount - grn) * 100);
    
    // Словники для українських числівників
    const onesMale = ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const onesFemale = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];
    const tenThousands = ['', 'десять', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    
    const convertHundreds = (num, isFeminine = false) => {
        let result = '';
        const ones = isFeminine ? onesFemale : onesMale;
        
        if (num >= 100) {
            result += hundreds[Math.floor(num / 100)] + ' ';
            num %= 100;
        }
        
        if (num >= 20) {
            result += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        } else if (num >= 10) {
            result += teens[num - 10] + ' ';
            num = 0;
        }
        
        if (num > 0) {
            result += ones[num] + ' ';
        }
        
        return result.trim();
    };
    
    const convertNumber = (num, isFeminine = false) => {
        if (num === 0) return 'нуль';
        
        let result = '';
        
        // Десятки тисяч (10000-99999)
        if (num >= 10000) {
            const tenThousandsDigit = Math.floor(num / 10000);
            const thousandsDigit = Math.floor((num % 10000) / 1000);
            
            if (tenThousandsDigit === 1 && thousandsDigit >= 1) {
                const teensThousands = Math.floor(num / 1000);
                if (teensThousands >= 10 && teensThousands <= 19) {
                    result += teens[teensThousands - 10] + ' тисяч ';
                    num %= 1000;
                } else {
                    result += tenThousands[tenThousandsDigit] + ' ';
                    num %= 10000;
                }
            } else {
                result += tenThousands[tenThousandsDigit] + ' ';
                num %= 10000;
            }
        }
        
        // Тисячі (1000-9999)
        if (num >= 1000) {
            const thousandsDigit = Math.floor(num / 1000);
            
            if (thousandsDigit <= 4) {
                const thousandWords = ['', 'одна тисяча', 'дві тисячі', 'три тисячі', 'чотири тисячі'];
                result += thousandWords[thousandsDigit] + ' ';
            } else if (thousandsDigit <= 9) {
                result += onesMale[thousandsDigit] + ' тисяч ';
            } else {
                result += convertHundreds(thousandsDigit, false) + ' тисяч ';
            }
            
            num %= 1000;
        }
        
        result += convertHundreds(num, isFeminine);
        return result.trim();
    };
    
    let grnText = convertNumber(grn, true); // Жіночий рід для гривень
    if (!grnText) grnText = 'нуль';
    
    const kopText = kop.toString().padStart(2, '0');
    return `${grnText} грн. ${kopText} коп.`;
};

/**
 * Створює загальні патчі для футера документів
 * @returns {Promise<Object>} Об'єкт з патчами для футера
 */
const createFooterPatches = async () => {
    const qrCodeData = await fs.readFile("./files/qr-code.png");
    
    return {
        footer_info: {
            type: PatchType.DOCUMENT,
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: `          Перевірити заборгованість можна у застосунках «${website_name}» `, 
                            font: FONT_CONFIG.family, 
                            size: FONT_CONFIG.sizes.medium 
                        }),
                        createHyperlink(website_url, website_url, { size: FONT_CONFIG.sizes.medium }),
                        new TextRun({ 
                            text: ` або через чат-бот в Telegram «${telegram_name}» `, 
                            font: FONT_CONFIG.family, 
                            size: FONT_CONFIG.sizes.medium 
                        }),
                        createHyperlink(telegram_url, telegram_url, { size: FONT_CONFIG.sizes.medium }),
                        new TextRun({ 
                            text: `. Вони дозволяють отримати актуальну інформацію щодо стану вашої заборгованості та оплатити її онлайн за допомогою QR-коду, що розміщений нижче.`, 
                            font: FONT_CONFIG.family, 
                            size: FONT_CONFIG.sizes.medium 
                        }),
                    ],
                    alignment: AlignmentType.LEFT
                })
            ],
        },
        image: {
            type: PatchType.DOCUMENT,
            children: [
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: qrCodeData,
                            transformation: {
                                width: 128,
                                height: 128,
                            },
                        }),
                    ],
                    alignment: AlignmentType.RIGHT
                })
            ],
        }
    };
};

// ==================== ОСНОВНІ ФУНКЦІЇ ==================== //

/**
 * Створює документ Word з реквізитами для земельної заборгованості
 * @param {Object} body - Основні дані (name, identification, date)
 * @param {Object} requisite - Реквізити для платежу
 * @returns {Buffer|false} Буфер документа або false при помилці
 */
const createRequisiteWord = async (body, requisite) => {
    try {
        const debts = addRequisiteToLandDebt(body, requisite).flat();
        
        if (!Array.isArray(debts) || debts.length === 0) {
            throw new Error("❌ ПОМИЛКА: debts порожній або не є масивом!");
        }

        const docBuffer = await fs.readFile("./files/doc1.docx");
        let totalAmount = 0;

        const children = debts.map((debt, index) => {
            totalAmount += parseFloat(debt.amount || 0);

            return [
                new Paragraph({ children: [new TextRun({ text: " " })] }),
                createParagraph(
                    `          ${index + 1}. ${debt.debtText}`, 
                    { size: FONT_CONFIG.sizes.large, alignment: AlignmentType.LEFT }
                ),
                createParagraph(
                    `{{requisiteText${index}}}`, 
                    { size: FONT_CONFIG.sizes.large, alignment: AlignmentType.CENTER }
                ),
                createParagraph(
                    `{{table${index}}}`, 
                    { size: FONT_CONFIG.sizes.large, alignment: AlignmentType.LEFT }
                ),
            ];
        }).flat();

        const patches = {
            next: { type: PatchType.DOCUMENT, children },
            name: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(body.name, { 
                        size: FONT_CONFIG.sizes.large, 
                        bold: true, 
                        alignment: AlignmentType.RIGHT 
                    })
                ],
            },
            ident: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(`і.к. ХХХХХХХ${body.identification}`, { 
                        size: FONT_CONFIG.sizes.medium, 
                        bold: true, 
                        italics: true, 
                        alignment: AlignmentType.RIGHT 
                    })
                ],
            },
            debt_info: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          ${territory_title} повідомляє, що відповідно до даних ГУ ДПС у ${GU_DPS_region}, станом ${formatDate(body.date)} у Вас наявна заборгованість до бюджету ${territory_title_instrumental}, а саме:`,
                        { size: FONT_CONFIG.sizes.large }
                    )
                ],
            },
            gu_dps: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          В разі виникнення питань по даній заборгованості, звертайтесь у ГУ ДПС у ${GU_DPS_region} за номером телефона ${phone_number_GU_DPS}.`,
                        { size: FONT_CONFIG.sizes.medium }
                    )
                ],
            },
            sanction_info: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          Просимо терміново погасити утворену Вами заборгованість до бюджету ${territory_title_instrumental}. Несвоєчасна сплата суми заборгованості призведе до нарахувань штрафних санкцій та пені.`,
                        { size: FONT_CONFIG.sizes.medium }
                    )
                ],
            },
            totalAmount: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `Загальна сума боргу по всіх платежах: ${totalAmount.toFixed(2)} грн`,
                        { size: FONT_CONFIG.sizes.small, bold: true }
                    )
                ],
            },
            ...(await createFooterPatches())
        };

        // Додаємо патчі для кожного боргу
        debts.forEach((debt, index) => {
            patches[`debtText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.debtText || "❌ ПОМИЛКА: Текст боргу відсутній",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.large
                    })
                ],
            };

            patches[`requisiteText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.requisiteText || "❌ ПОМИЛКА: Реквізити відсутні",
                        font: FONT_CONFIG.family,
                        bold: true,
                        size: FONT_CONFIG.sizes.large
                    })
                ],
            };

            patches[`table${index}`] = {
                type: PatchType.DOCUMENT,
                children: [
                    new Table({
                        rows: [
                            ...createTableRows(debt.table || []),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [
                                            createParagraph("Сума", { 
                                                bold: true, 
                                                size: FONT_CONFIG.sizes.medium, 
                                                alignment: AlignmentType.CENTER 
                                            })
                                        ],
                                    }),
                                    new TableCell({
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [
                                            createParagraph(`${debt.amount} грн`, { 
                                                size: FONT_CONFIG.sizes.medium, 
                                                alignment: AlignmentType.CENTER 
                                            })
                                        ],
                                    }),
                                ],
                            }),
                        ]
                    })
                ],
            };
        });

        return await patchDocument(docBuffer, { patches });
    } catch (error) {
        console.error('❌ Помилка під час створення документа:', error.message);
        return false;
    }
};

/**
 * Створює документ Word з реквізитами для комунальних послуг
 * @param {Array} body - Масив даних про заборгованості
 * @param {Object} requisite - Реквізити для платежу
 * @returns {Buffer|false} Буфер документа або false при помилці
 */
const createUtilitiesRequisiteWord = async (body, requisite) => {
    try {
        if (!Array.isArray(body)) {
            throw new Error("body має бути масивом");
        }

        const debts = body.map(item => {
            const result = addRequisiteToWaterDebt(item, requisite);
            return result;
        }).flat().filter(Boolean);

        const docBuffer = await fs.readFile("./files/docWater.docx");

        const children = debts.map((_, index) => [
            createParagraph(`{{debtText${index}}}`, { size: FONT_CONFIG.sizes.large }),
            createParagraph(`{{requisiteText${index}}}`, { 
                size: FONT_CONFIG.sizes.large, 
                alignment: AlignmentType.CENTER 
            }),
            createParagraph(`{{table${index}}}`, { size: FONT_CONFIG.sizes.large }),
        ]).flat();

        const formattedDate = formatDate(body[0]?.date);

        const patches = {
            next: { type: PatchType.DOCUMENT, children },
            name: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(body[0]?.fio || "НЕ ВКАЗАНО", { 
                        size: FONT_CONFIG.sizes.large, 
                        bold: true, 
                        alignment: AlignmentType.CENTER 
                    })
                ],
            },
            ident: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(`і.к. ${body[0]?.payerident || "НЕ ВКАЗАНО"}`, { 
                        size: FONT_CONFIG.sizes.medium, 
                        bold: true, 
                        italics: true, 
                        alignment: AlignmentType.CENTER 
                    })
                ],
            },
            debt_info: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          ${territory_title} повідомляє, що відповідно до наявних даних, станом на ${formattedDate} у Вас існує заборгованість з оплати комунальних послуг перед ${territory_title_instrumental}.`,
                        { size: FONT_CONFIG.sizes.large }
                    )
                ],
            },
            support_info: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          Якщо у вас виникли питання щодо цієї заборгованості, будь ласка, звертайтеся за телефоном служби підтримки: ${phone_number_GU_DPS}.`,
                        { size: FONT_CONFIG.sizes.medium }
                    )
                ],
            },
            sanction_info: {
                type: PatchType.DOCUMENT,
                children: [
                    createParagraph(
                        `          Просимо вас своєчасно оплатити заборгованість, щоб уникнути можливих штрафних санкцій та припинення надання комунальних послуг.`,
                        { size: FONT_CONFIG.sizes.medium }
                    )
                ],
            },
            ...(await createFooterPatches())
        };

        // Додаємо патчі для кожного боргу
        debts.forEach((debt, index) => {
            patches[`debtText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.debtText || "❌ ПОМИЛКА: Текст боргу відсутній",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.large
                    })
                ],
            };

            patches[`requisiteText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.requisiteText || "❌ ПОМИЛКА: Реквізити відсутні",
                        font: FONT_CONFIG.family,
                        bold: true,
                        size: FONT_CONFIG.sizes.large
                    })
                ],
            };

            patches[`table${index}`] = {
                type: PatchType.DOCUMENT,
                children: [
                    new Table({
                        rows: createTableRows(debt.table || [])
                    })
                ],
            };
        });

        return await patchDocument(docBuffer, { patches });
    } catch (error) {
        console.error('❌ Помилка під час створення документа:', error.message);
        return false;
    }
};

/**
 * Створює документ Word з податковим повідомленням
 * @param {Object} charge - Дані про нарахування
 * @param {Object} settings - Налаштування системи
 * @param {Object} debtorInfo - Додаткова інформація про боржника
 * @returns {Buffer} Буфер документа або throw error при помилці
 */
const createTaxNotificationWord = async (charge, settings, debtorInfo = null) => {
    try {
        console.log("CURRENT_REGION",CURRENT_REGION)
        // Визначаємо тип податку динамічно
        const { taxType, taxName } = determineTaxType(charge);
        
        const docBuffer = await fs.readFile("./files/docMessage.docx");
        
        // Форматування даних
        const formattedDocumentDate = formatDate(charge.document_date, false);
        const amountInWords = convertNumberToWords(charge.amount);
        const amountFormatted = Number(charge.amount).toFixed(2);
        
        // Заборгованості з debtorInfo
        const debtAmounts = {
            non_residential: formatDebtAmount(debtorInfo?.non_residential_debt || 0),
            residential: formatDebtAmount(debtorInfo?.residential_debt || 0),
            land: formatDebtAmount(debtorInfo?.land_debt || 0),
            rent: formatDebtAmount(debtorInfo?.orenda_debt || 0),
            mpz: formatDebtAmount(debtorInfo?.mpz || 0)
        };
        
        // Отримуємо правильні реквізити для поточного типу податку
        const currentTaxRequisites = getRequisitesForTaxType(settings, taxType);
        
        // Створюємо патчі
        const patches = {
            // ОСНОВНА ІНФОРМАЦІЯ
            payer_name: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: charge.payer_name?.toUpperCase() || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            },
            tax_number: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: charge.tax_number || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            },
            plot_number: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: charge.full_document_id || charge.account_number || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small
                    })
                ],
            },
            tax_amount: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: amountFormatted,
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small
                    })
                ],
            },
            amount_in_words: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: amountInWords,
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small
                    })
                ],
            },
            // ДИНАМІЧНА НАЗВА ПОДАТКУ
            tax_type_name: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: taxName,
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            },
            // ОСНОВНІ РЕКВІЗИТИ
            GU_DPS_region: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: GU_DPS_region || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            },
            debt_charge_account: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: currentTaxRequisites?.account || debt_charge_account || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.tiny,
                        bold: false
                    })
                ],
            },
            recipient_name: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: currentTaxRequisites?.recipientname || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.tiny,
                        bold: false
                    })
                ],
            },
            GU_DPS_region_dative: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: CURRENT_REGION?.dative || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            },
            website_name: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: website_name || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.tiny,
                        bold: false,
                        italics: true
                    })
                ],
            },
            GU_DPS_ADDRESS: {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: GU_DPS_ADDRESS || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.small,
                        bold: true
                    })
                ],
            }
        };

        // Додаємо заборгованості для всіх типів податків
        Object.keys(debtAmounts).forEach(debtType => {
            patches[`${debtType}_debt_amount`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debtAmounts[debtType],
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.extraSmall
                    })
                ],
            };
        });

        // Додаємо призначення платежів для всіх типів податків
        const taxTypes = ['main', 'non_residential', 'residential', 'land', 'rent', 'mpz'];
        taxTypes.forEach(type => {
            const actualType = type === 'main' ? taxType : type;
            patches[`payment_purpose_${type}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: formatPaymentPurpose(charge, settings, actualType),
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.extraSmall
                    })
                ],
            };
        });

        // Додаємо реквізити отримувачів для всіх типів податків
        ['non_residential', 'residential', 'land', 'rent', 'mpz'].forEach(type => {
            const requisites = getRequisitesForTaxType(settings, type);
            
            patches[`${type}_recipient_name`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: requisites?.recipientname || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.extraSmall
                    })
                ],
            };
            
            patches[`${type}_account`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: requisites?.account || "НЕ ВКАЗАНО",
                        font: FONT_CONFIG.family,
                        size: FONT_CONFIG.sizes.extraSmall
                    })
                ],
            };
        });
        
        const patchedDoc = await patchDocument(docBuffer, { patches });
        return patchedDoc;
        
    } catch (error) {
        console.error('❌ Помилка під час створення податкового повідомлення:', error.message);
        throw error;
    }
};

module.exports = {
    createRequisiteWord,
    createUtilitiesRequisiteWord,
    createTaxNotificationWord,
    
    determineTaxType,
    getRequisitesForTaxType,
    formatPaymentPurpose,
    convertNumberToWords,
    formatDebtAmount,
    formatDate
};