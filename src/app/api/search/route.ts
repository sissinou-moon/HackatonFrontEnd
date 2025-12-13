
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query } = body;

        // Mock response structure based on the user's example
        // In a real implementation, this would query a vector database (e.g., Pinecone)
        const mockResponse = {
            success: true,
            query: query || "IDOOM INTERNET ADSL",
            count: 6,
            results: [
                {
                    fileName: "Convention_AT___L_A_tablissement_T.docx",
                    folder: "Convention",
                    displayPath: "Convention/Convention_AT___L_A_tablissement_T.docx",
                    matches: [
                        {
                            text: "Service Internet : \nCréation d'accès Internet IDOOM ADSL, VDSL et IDOOM FIBRE, dont les débits varient entre 20 Mbits et 1.2Gbps.\nIdoom Fibre :\nPalier\nTarif (Da/Mois)\nRemise\nNouveau Tarif Préférentiel\nService\n60 Mbps\n2 200 Da\n50%\n1 100 Da\nFIBRE\n120 Mbps\n2 400 Da\n50%\n1 200 Da\nFIBRE\n240 Mbps\n2 600 Da\n50%\n1 300 Da\nFIBRE\n480 Mbps\n2 800 Da\n50%\n1 400 Da\nFIBRE\n600 Mbps \n3 000 Da\n50%\n1 500 Da\nFIBRE\n1 Gbps\n3 600 Da\n50%\n1 800 Da\nFIBRE\n1.5 Gbps\n4 200 Da\n50%\n2 100 Da\nFIBRE\nIdoom ADSL et VDSL :\nPalier",
                            lineNumber: 11,
                            score: 0.526770473
                        },
                        {
                            text: "Service Internet : \nCréation d'accès Internet IDOOM ADSL, VDSL et IDOOM FIBRE, dont les débits varient entre 20 Mbits et 1.2Gbps.\nIdoom Fibre :\nPalier\nTarif (Da/Mois)\nRemise\nNouveau Tarif Préférentiel\nService\n60 Mbps\n2 200 Da\n50%\n1 100 Da\nFIBRE\n120 Mbps\n2 400 Da\n50%\n1 200 Da\nFIBRE\n240 Mbps\n2 600 Da\n50%\n1 300 Da\nFIBRE\n480 Mbps\n2 800 Da\n50%\n1 400 Da\nFIBRE\n600 Mbps \n3 000 Da\n50%\n1 500 Da\nFIBRE\n1 Gbps\n3 600 Da\n50%\n1 800 Da\nFIBRE\n1.5 Gbps\n4 200 Da\n50%\n2 100 Da\nFIBRE\nIdoom ADSL et VDSL :\nPalier",
                            lineNumber: 11,
                            score: 0.526770473
                        }
                    ]
                },
                {
                    fileName: "Convention_AlgA_rie_TA_lA_com___La__A_tablissement_AC.docx",
                    folder: "Convention",
                    displayPath: "Convention/Convention_AlgA_rie_TA_lA_com___La__A_tablissement_AC.docx",
                    matches: [
                        {
                            text: "Service Internet (Idoom ADSL, VDS & FIBRE) : \nCréation d'accès Internet IDOOM ADSL ;VDSL et IDOOM FIBRE, dont les débits varient entre 20 Mbits et 1.5 Gbps\nPersonnel en activité et retraité :\nIdoom fibre :\nPalier\nTarif (Da/Mois)\nRemise\nNouveau Tarif Préférentiel\nService\n60 Mbps\n2 200 Da\n50%\n1 100 Da\nFIBRE\n120 Mbps\n2 400 Da\n50%\n1 200 Da\nFIBRE\n240 Mbps\n2 600 Da\n50%\n1 300 Da\nFIBRE\n480 Mbps\n2 800 Da\n50%\n1 400 Da\nFIBRE\n600 Mbps\n3 000 Da\n50%\n1 500 Da\nFIBRE\n1 Gbps\n3 600 Da\n50%\n1 800 Da\nFIBRE\n1.5 Gbps",
                            lineNumber: 10,
                            score: 0.493638575
                        }
                    ]
                },
                {
                    fileName: "R_____U___U_U______U_U__________U________U____________U___U_U_________.docx",
                    folder: "Convention",
                    displayPath: "Convention/R_____U___U_U______U_U__________U________U____________U___U_U_________.docx",
                    matches: [
                        {
                            text: "تنطبق هذه التسعيرات التفضيلية على عروض، VDSL IDOOM ADSL،  Idoom Fibre، وعروض IDOOM Fixe، مع إمكانية الاستفادة من شبكة IDOOM 4G LTE المخصّصة فقط للعملاء المقيمين في المناطق غير المغطاة بالتقنيات السلكية.\n1. ما هي تفاصيل العروض المعنية بالاتفاقية ؟\nيتم توضيح المعلومات المتعلقة بعروض الإنترنت في جدولين حسب تصنيف المؤسسة: R \nعروض الإنترنت الخاصة المؤسسة R المحرومة :\nعرض  20 IDOOM ADSL  ميغابت/ثا\nعرض IDOOM VDSL50 ميغابت/ثا\nعرض300 IDOOM Fibre  ميغابت/ثا",
                            lineNumber: 8,
                            score: 0.442060113
                        },
                        {
                            text: "عرض  20 IDOOM ADSL  ميغابت/ثا\nعرض IDOOM VDSL50 ميغابت/ثا\nعرض300 IDOOM Fibre  ميغابت/ثا\nإنترنت بسعر3100 دج/شهريًا✓ تدفّق 20 ميغابت/ثا✓ رسوم التركيب مجانية✓ عنوان IP ثابت مجاني✓ صندوق بريد إلكتروني بسعة 1 جيغابايت\nإنترنت بسعر 3600دج/شهريًا\n✓ تدفّق 50 ميغابت/ثا\n✓ رسوم التركيب مجانية✓ عنوان IP ثابت مجاني✓ صندوق بريد إلكتروني بسعة 1 جيغابايت\nإنترنت بسعر 4000دج/شهريًا\n☑ تدفّق 100 ميغابت/ثا☑ رسوم التركيب مجانية☑ عنوان IP ثابت مجاني☑ صندوق بريد إلكتروني 1 جيغابايت☑ مودم بصري مجاني\nخدمة الهاتف: ",
                            lineNumber: 22,
                            score: 0.490833282
                        }
                    ]
                },
                {
                    fileName: "AD_____U___U_U______U_U__________U________U____________U____U_U_________.docx",
                    folder: "Convention",
                    displayPath: "Convention/AD_____U___U_U______U_U__________U________U____________U____U_U_________.docx",
                    matches: [
                        {
                            text: "الإنترنت Idoom Internet ADSL وVDSL وIdoom Fibre ابتداءً من 20 ميغابت/ثانية.\nالهاتف الثابت: Idoom Fixe.\n2- ما هي تفاصيل عروض Idoom ADSL وVDSL وIdoom Fibre حسب الاتفاقية السارية؟يتم تقديم تفاصيل عروض الإنترنت عبر تقنيات.VDSL ; ADSL والألياف البصرية، والتي تتراوح تدفقاتها بين 20 ميغابت/ثانية و1 جيغابت/ثانية، في الجدول المبين أدناه.\nالتدفق\nالسعر(دج/شهر)\nالسعر التفضيلي الجديد\nالخدمة\n ميغابت/ثا20 \n دج2 200 \n  دج1 100 \nADSL  & FIBRE\n ميغابت/ثا 50 \n دج 2 400 \n دج1 200 \nVDSL & FIBRE\n ميغابت/ثا 100 ",
                            lineNumber: 8,
                            score: 0.465414852
                        }
                    ]
                },
                {
                    fileName: "1765596667899-Argumentaire_Mise___jour_offre_idoom_fibre__ADSL_et_VDSL_17072025_version_FR.docx",
                    folder: "Offres",
                    displayPath: "Offres/1765596667899-Argumentaire_Mise___jour_offre_idoom_fibre__ADSL_et_VDSL_17072025_version_FR.docx",
                    matches: [
                        {
                            text: "Dans le cadre de la refonte de notre offre Internet IDOOM Fibre, ADSL et VDSL destinées aux clients résidentiels avec de nouveaux paliers de débits et une réduction tarifaire sur les forfaits IDOOM ADSL, VDSL à partir de 20 Mbps. Cette évolution permet à nos clients de bénéficier d’une connexion plus rapide répondant ainsi à leurs besoins croissants en matière de connectivité.\nAlgérie Télécom lance une nouvelle grille tarifaire pour ses offres Internet IDOOM FIBRE, avec des débits boostés à des prix plus compétitifs. Cette offre s’adresse aux nouveaux clients comme aux clients existants, avec des avantages considérables sur le débit et les tarifs. ",
                            lineNumber: 6,
                            score: 0.439168751
                        },
                        {
                            text: "La nouvelle offre s'applique aux clients résidentiels, qu'ils soient nouveaux ou existants, et qu'ils utilisent IDOOM FIBRE, ADSL ou VDSL.\nLes nouveaux abonnés doivent-ils signer un contrat d’engagement ?\nEn effet, les nouveaux abonnés sont tenus de s'engager pour une période de 12 mois.\nQuels sont les détails des offre internet IDOOM ADSL, VDSL ou IDOOM FIBRE ?",
                            lineNumber: 9,
                            score: 0.447274148
                        },
                        {
                            text: "Quels sont les détails des offre internet IDOOM ADSL, VDSL ou IDOOM FIBRE ?\nLes tableaux tarifaires présente l'offre en précisant les anciennes et nouvelles tarifications, ainsi que les débits liés à la nouvelle offre, comme suit :\nDETAIL DE L’OFFRE IDOOM FIBRE :\nNouvelle acquisition IDOOM Fibre (FTTH) : \nPALIER ACTUEL\nNOUVEAU PALIER\nNOUVEAU TARIF MENSUEL\nAVANTAGES\n30 Mbps\n60 Mbps\n2 200  Da/Mois\nModem Optique\n+\n01 Mois de connexion\n+\nFrais d’installation\n60 Mbps\n120 Mbps\n2 400  Da/Mois\n120 Mbps",
                            lineNumber: 12,
                            score: 0.449076593
                        }
                    ]
                },
                {
                    fileName: "Convention__AT___La__A_tablissement_A.docx",
                    folder: "Convention",
                    displayPath: "Convention/Convention__AT___La__A_tablissement_A.docx",
                    matches: [
                        {
                            text: "Service Internet (XDSL & FIBRE) : \nCréation d'accès Internet Idoom ADSL, VDSL Idoom Fibre les débits varient entre 15 Mbits jusqu’à 1.2Gbps :\nService internet Idoom Fibre : \nPalier\nTarif (Da/Mois)\nRemise\nNouveau Tarif Préférentiel\nService\n60 Mbps\n2 200 Da\n50%\n1 100 Da\nFIBRE\n120 Mbps\n2 400 Da\n50%\n1 200 Da\nFIBRE\n240 Mbps\n2 600 Da\n50%\n1 300 Da\nFIBRE\n480 Mbps\n2 800 Da\n60%\n1 120 Da\nFIBRE\n600 Mbps\n3 000 Da\n60%\n1 200 Da\nFIBRE\n1 Gbps\n3 600 Da\n60%\n1 440 Da\nFIBRE\n1.5 Gbps\n4 200 Da\n60%\n1 680 Da\nFIBRE",
                            lineNumber: 10,
                            score: 0.435792238
                        }
                    ]
                }
            ]
        };

        return NextResponse.json(mockResponse);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
