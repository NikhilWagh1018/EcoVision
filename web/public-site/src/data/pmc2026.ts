// Elected corporators of the Pune Municipal Corporation, 2026 election (41 prabhags, 165 seats).
// Source: Wikipedia, "2026 Pune Municipal Corporation election" (winner table), read 19 Nov 2026.
// Ward-committee chairs: MyJansevak PMC directory (third-party, undated, 2026). Not an official PMC list:
// always confirm at pmc.gov.in before relying on a name for an official purpose.
export type PartyCode = "B" | "N" | "C" | "NS" | "U" | "R";
export interface Member { seat: string; name: string; party: PartyCode }
export interface Prabhag { n: number; name: string; members: Member[] }
export interface Committee { office: string; chair: string; prabhag: number }

export const PARTY: Record<PartyCode, { short: string; full: string; color: string }> = {
  B: { short: "BJP", full: "Bharatiya Janata Party", color: "#E8710A" },
  N: { short: "NCP", full: "Nationalist Congress Party", color: "#0B7285" },
  C: { short: "INC", full: "Indian National Congress", color: "#1971C2" },
  NS: { short: "NCP (SP)", full: "Nationalist Congress Party (Sharadchandra Pawar)", color: "#5F3DC4" },
  U: { short: "SS (UBT)", full: "Shiv Sena (Uddhav Balasaheb Thackeray)", color: "#C2255C" },
  R: { short: "RPI (A)", full: "Republican Party of India (Athawale)", color: "#2B8A3E" },
};

export const PRABHAGS: Prabhag[] = [
 {
  "n": 1,
  "name": "Kalas-Dhanori-Lohegaon",
  "members": [
   {
    "seat": "A",
    "name": "Ashwini Rahul (Appa) Bhandare",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Dangat Sangita Sandeep",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Rekha Chandrakant Tingre",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Anil (Bobby) Vasantrao Tingre",
    "party": "B"
   }
  ]
 },
 {
  "n": 2,
  "name": "Phulenagar-Nagpur Chawl",
  "members": [
   {
    "seat": "A",
    "name": "Dhende Nandini Siddharth",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Ravi (Harshal) Ramesh Tingre",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Shital Ajay Sawant",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Suhas Vijay Tingre",
    "party": "N"
   }
  ]
 },
 {
  "n": 3,
  "name": "Vimannagar-Lohegaon",
  "members": [
   {
    "seat": "A",
    "name": "Dr. Shreyas Pritam Khandve",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Anil Dilip Satav",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Aishwarya Surendra Pathare",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Dabhade Ramdas Dattatray",
    "party": "B"
   }
  ]
 },
 {
  "n": 4,
  "name": "Kharadi-Wagholi",
  "members": [
   {
    "seat": "A",
    "name": "Bansode Shailjeet Jaywant",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Ratnamala Sandeep Satav",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Bharane Trupti Santosh",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Surendra Bapusaheb Pathare",
    "party": "B"
   }
  ]
 },
 {
  "n": 5,
  "name": "Kalyaninagar-Vadgaonsheri",
  "members": [
   {
    "seat": "A",
    "name": "Narayan Mohan Galande",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Galande Shweta Mukund",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Galande Kavita Mahendra",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Mulik Yogesh Tukaram",
    "party": "B"
   }
  ]
 },
 {
  "n": 6,
  "name": "Yerawada-Gandhinagar",
  "members": [
   {
    "seat": "A",
    "name": "Adv. Avinash Raj Salve",
    "party": "C"
   },
   {
    "seat": "B",
    "name": "Saira Hanif Sheikh",
    "party": "C"
   },
   {
    "seat": "C",
    "name": "Ashwini Daniel Landge",
    "party": "C"
   },
   {
    "seat": "D",
    "name": "Vishal Hari Malke",
    "party": "C"
   }
  ]
 },
 {
  "n": 7,
  "name": "Gokhalenagar-Wakdewadi",
  "members": [
   {
    "seat": "A",
    "name": "Manvatkar Nisha Sachin",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Anjali Vinodanna Orse",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Adv. Nikam Nilesh Narayan",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Datta Bahirat",
    "party": "N"
   }
  ]
 },
 {
  "n": 8,
  "name": "Aundh-Bopodi",
  "members": [
   {
    "seat": "A",
    "name": "Parshuram Balkrishna Wadekar",
    "party": "R"
   },
   {
    "seat": "B",
    "name": "Bhakti Ajit Gaikwad",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Chhajed Sapna Anand",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Chandrashekhar (Sunny) Vinayak Nimhan",
    "party": "B"
   }
  ]
 },
 {
  "n": 9,
  "name": "Sus-Baner-Pashan",
  "members": [
   {
    "seat": "A",
    "name": "Chimte Rohini Sudhir",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Chandere Baburao Dattoba",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Kokate Mayuri Rahul",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Amol Ratan Balwadkar",
    "party": "N"
   }
  ]
 },
 {
  "n": 10,
  "name": "Bavdhan-Bhusari Colony",
  "members": [
   {
    "seat": "A",
    "name": "Kiran Dagde Patil",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Pawar Rupali Sachin",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Varape Alpana Ganesh",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Vedepatil Dilip Tukaram",
    "party": "B"
   }
  ]
 },
 {
  "n": 11,
  "name": "Rambaug Colony-Shivteerthnagar",
  "members": [
   {
    "seat": "A",
    "name": "Harshwardhan Deepak Mankar",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Dokh Deepali Santosh",
    "party": "C"
   },
   {
    "seat": "C",
    "name": "Butala Manisha Sandeep",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Adv. Ramchandra (Chandusheth) Atmaram Kadam",
    "party": "C"
   }
  ]
 },
 {
  "n": 12,
  "name": "Shivajinagar-Model Colony",
  "members": [
   {
    "seat": "A",
    "name": "Amruta Ram Mhetre (Zadpe)",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Apoorva Dattatray Khade",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Pooja Pratul Jagade",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Ekabote Nivedita Gajanan",
    "party": "B"
   }
  ]
 },
 {
  "n": 13,
  "name": "Pune Station-Jay Jawannagar",
  "members": [
   {
    "seat": "A",
    "name": "Nilesh Suresh Alhat",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Sumayya Maheboob Nadaf",
    "party": "C"
   },
   {
    "seat": "C",
    "name": "Vaishali Nagnath Bhalerao",
    "party": "C"
   },
   {
    "seat": "D",
    "name": "Arvind Shinde",
    "party": "C"
   }
  ]
 },
 {
  "n": 14,
  "name": "Koregaon Park-Ghorpadi-Mundhwa",
  "members": [
   {
    "seat": "A",
    "name": "Himali Navnath Kamble",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Dhayarkar Kishor Vishnu",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Kawade Surekha Chandrakant",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Gaikwad Umesh Dnyaneshwar",
    "party": "B"
   }
  ]
 },
 {
  "n": 15,
  "name": "Manjri-Budhruk-Keshavnagar-Sadesatranali",
  "members": [
   {
    "seat": "A",
    "name": "Abnave Nanda Anil",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Dr. Dada Kodre",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Ghule Sarika Amit",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Ajit Dattatraya Ghule",
    "party": "N"
   }
  ]
 },
 {
  "n": 16,
  "name": "Hadapsar-Satavwadi",
  "members": [
   {
    "seat": "A",
    "name": "Bankar Vaishali Sunil",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Jangle Ujwala Subhash",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Gawade Nitin Nivrutti",
    "party": "U"
   },
   {
    "seat": "D",
    "name": "Tupe Maruti Shivaji",
    "party": "B"
   }
  ]
 },
 {
  "n": 17,
  "name": "Ramtekdi-Malwadi-Vaiduwadi",
  "members": [
   {
    "seat": "A",
    "name": "Londhe Khandu Satish",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Hemlata Nilesh Magar",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Payal Viraj Tupe",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Prashant (Mama) Tupe",
    "party": "B"
   }
  ]
 },
 {
  "n": 18,
  "name": "Wanowrie-Salunkhe Vihar",
  "members": [
   {
    "seat": "A",
    "name": "Adv. Kedari Sahil Shivaji",
    "party": "C"
   },
   {
    "seat": "B",
    "name": "Kalinda Muralidhar Punde",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Komal Samir Shendkar",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Jagtap Prashant Sudam",
    "party": "C"
   }
  ]
 },
 {
  "n": 19,
  "name": "Kondhwa Khurd-Kausurbaug",
  "members": [
   {
    "seat": "A",
    "name": "Taslim Hasan Shaikh",
    "party": "C"
   },
   {
    "seat": "B",
    "name": "Aasia Maniyar",
    "party": "C"
   },
   {
    "seat": "C",
    "name": "Kashif Fakrul Syed",
    "party": "C"
   },
   {
    "seat": "D",
    "name": "Pathan Abdul Ghafoor Ahmed",
    "party": "NS"
   }
  ]
 },
 {
  "n": 20,
  "name": "Shankar Maharaj Math-Bibewadi",
  "members": [
   {
    "seat": "A",
    "name": "Aaba (Rajendra) Y. Shilimkar",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Divekar Tanvi Prashant",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Deshpande Mansi Manoj",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Gaurav Ganesh Ghule",
    "party": "N"
   }
  ]
 },
 {
  "n": 21,
  "name": "Mukundnagar-Salisbury Park",
  "members": [
   {
    "seat": "A",
    "name": "Vairage Prasannajit Bharat",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Shilimkar Siddhi Avinash",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Chorbele Manisha Pravin",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Bhimale Srinath Yashwant",
    "party": "B"
   }
  ]
 },
 {
  "n": 22,
  "name": "Kashewadi-Dias Plot",
  "members": [
   {
    "seat": "A",
    "name": "Mrunal Pandurang (Bappu) Kamble",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Rafiq Abdul Rahim Sheikh",
    "party": "C"
   },
   {
    "seat": "C",
    "name": "Archana Tushar Patil",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Vivek Mahadev Yadav",
    "party": "B"
   }
  ]
 },
 {
  "n": 23,
  "name": "Rawiwar Peth-Nana Peth",
  "members": [
   {
    "seat": "A",
    "name": "Javale Pallavi Chandrashekhar",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Andekar Sonali Vanraj",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Andekar Lakshmi Udayakant",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Dhanwade Vishal Gorakh",
    "party": "B"
   }
  ]
 },
 {
  "n": 24,
  "name": "Kasba Ganpati-Kamla Nehru Hospital-KEM hospital",
  "members": [
   {
    "seat": "A",
    "name": "Bahirat Kalpana Dilip",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Ujwala Ganesh Yadav",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Devendra (Chhotu) Wadke",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Bidkar Ganesh Madhukar",
    "party": "B"
   }
  ]
 },
 {
  "n": 25,
  "name": "Shaniwar Peth-Mahatma Phule Mandai",
  "members": [
   {
    "seat": "A",
    "name": "Swapnali Nitin Pandit",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Raghavendra (Bappu) Mankar",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Swarada Gaurav Bapat",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Tilak Kunal Shailesh",
    "party": "B"
   }
  ]
 },
 {
  "n": 26,
  "name": "Ghorpade Peth-Gurwarpeth-Samta Bhoomi",
  "members": [
   {
    "seat": "A",
    "name": "Ganesh Bugaji Kalyankar",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Malwade Sneha Namdev",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Aishwarya Samrat Thorat",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Ajay Appasaheb Khedekar",
    "party": "B"
   }
  ]
 },
 {
  "n": 27,
  "name": "Navi Peth-Parvati",
  "members": [
   {
    "seat": "A",
    "name": "Mahesh (Amar) Vilas Awale",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Smita Vaste",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Gaud Lata Raghunath",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Dheeraj Ramachandra Ghate",
    "party": "B"
   }
  ]
 },
 {
  "n": 28,
  "name": "Janta Vasahat-Hingane Khurd",
  "members": [
   {
    "seat": "A",
    "name": "Rithe Vrushali Anand",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Gadade Priya Shivaji",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Suraj Nathuram Lokhande",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Adv. Prasanna (Dada) Ghanshyam Jagtap",
    "party": "B"
   }
  ]
 },
 {
  "n": 29,
  "name": "Deccan Gymkhana-Happy Colony",
  "members": [
   {
    "seat": "A",
    "name": "Pande Sunil Namdev",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Adv. Sawalekar Mitali Kuldeep",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Khardekar Manjushree Sandeep",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Joshi Puneeth Srikant",
    "party": "B"
   }
  ]
 },
 {
  "n": 30,
  "name": "Karvenagar-Hingane Home Colony",
  "members": [
   {
    "seat": "A",
    "name": "Dudhane Swapnil Devaram",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Barate Reshma Santosh",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Tejashree Mahesh Pawale",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Barate Rajesh Kisan",
    "party": "B"
   }
  ]
 },
 {
  "n": 31,
  "name": "Mayur Colony-Kothrud",
  "members": [
   {
    "seat": "A",
    "name": "Mathwad Dinesh Mahadev",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Jyotsna Jagannath Kulkarni",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Vasanti Navnath Jadhav",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Sutar Prithviraj Shashikant",
    "party": "B"
   }
  ]
 },
 {
  "n": 32,
  "name": "Warje-Popularnagar",
  "members": [
   {
    "seat": "A",
    "name": "Bhosale Harshada Shantanu",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Barate Bharatbhushan Sharadchandra",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Wanjale Sayali Rameshbhai",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Dodke Sachin Shivajirao",
    "party": "B"
   }
  ]
 },
 {
  "n": 33,
  "name": "Shivane-Khadakwasla-Dhayari",
  "members": [
   {
    "seat": "A",
    "name": "Dhanashree Dattatray Kolhe",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Anita Tukaram Ingle",
    "party": "NS"
   },
   {
    "seat": "C",
    "name": "Nanekar Subhash Muralidhar",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Sopan (Kaka) Chavan",
    "party": "NS"
   }
  ]
 },
 {
  "n": 34,
  "name": "Vadgaon Budhruk-Dhayari",
  "members": [
   {
    "seat": "A",
    "name": "Charwad Haridas Krishna",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Komal Sarang Navale",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Jayshree Satyawan Bhumkar",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Raju Murlidhar Laygude",
    "party": "B"
   }
  ]
 },
 {
  "n": 35,
  "name": "Suncity-Manikbaug",
  "members": [
   {
    "seat": "A",
    "name": "Gosavi Jyoti Kishor",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Manjusha Deepak Nagpure",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "More Sachin Raosaheb",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Shrikant Shashikant Jagtap",
    "party": "B"
   }
  ]
 },
 {
  "n": 36,
  "name": "Sahakarnagar-Padmavati",
  "members": [
   {
    "seat": "A",
    "name": "Veena Ganesh Ghosh",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Bhosale Shailaja Arun",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Sai Prashant Thopte",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Mahesh Nanasaheb Wable",
    "party": "B"
   }
  ]
 },
 {
  "n": 37,
  "name": "Dhankawadi-Katraj Dairy",
  "members": [
   {
    "seat": "A",
    "name": "Balabhau (Kishor) Uttam Dhankawade",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Tapkir Varsha Vilas",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Badak Tejashree Sachin",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Arun Bhagwan Rajwade",
    "party": "B"
   }
  ]
 },
 {
  "n": 38,
  "name": "Balajinagar-Ambegaon-Katraj",
  "members": [
   {
    "seat": "A",
    "name": "Smita Sudhir Kondhare",
    "party": "N"
   },
   {
    "seat": "B",
    "name": "Beldare Sandeep Balasaheb",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Beldare Seema Yuvraj",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Chorghe Pratibha Rohidas",
    "party": "B"
   },
   {
    "seat": "E",
    "name": "Khopade Vyankoji Maruti",
    "party": "B"
   }
  ]
 },
 {
  "n": 39,
  "name": "Upper Super Indiranagar",
  "members": [
   {
    "seat": "A",
    "name": "Varsha Bhimrao Sathe",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Pratik Prakash Kadam",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Dhadve Rupali Dinesh",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Bala (Pramod) Premchand Oswal",
    "party": "B"
   }
  ]
 },
 {
  "n": 40,
  "name": "Kondhwa Budhruk-Yeolewadi",
  "members": [
   {
    "seat": "A",
    "name": "Archana Amit Jagtap",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Kamthe Vrushali Sunil",
    "party": "B"
   },
   {
    "seat": "C",
    "name": "Kadam Tushar Puja",
    "party": "B"
   },
   {
    "seat": "D",
    "name": "Tilekar Ranjana Kundalik",
    "party": "B"
   }
  ]
 },
 {
  "n": 41,
  "name": "Mohammadwadi-Undri",
  "members": [
   {
    "seat": "A",
    "name": "Alhat Prachi Ashish",
    "party": "B"
   },
   {
    "seat": "B",
    "name": "Bandal Nivrutti Dnyanoba",
    "party": "N"
   },
   {
    "seat": "C",
    "name": "Shweta Sachin Ghule",
    "party": "N"
   },
   {
    "seat": "D",
    "name": "Tarwade Atul Narayan",
    "party": "B"
   }
  ]
 }
];

export const COMMITTEES: Committee[] = [
 {
  "office": "Aundh – Baner",
  "chair": "Rohini Sudhir Chimte",
  "prabhag": 9
 },
 {
  "office": "Dhole Patil Road",
  "chair": "Surekha Chandrakant Kawade",
  "prabhag": 14
 },
 {
  "office": "Yerawada – Vadgaonsheri",
  "chair": "Kavita Mahendra Galande",
  "prabhag": 5
 },
 {
  "office": "Kothrud – Bavdhan",
  "chair": "Vasanti Navanath Jadhav",
  "prabhag": 31
 },
 {
  "office": "Ghole Road (Shivajinagar)",
  "chair": "Amruta Ram Mhetre",
  "prabhag": 12
 },
 {
  "office": "Wanawadi",
  "chair": "Sahil Shivaji Kedari",
  "prabhag": 18
 },
 {
  "office": "Kondhwa – Undri",
  "chair": "Ranjana Kundalik Tilekar",
  "prabhag": 40
 },
 {
  "office": "Bibwewadi",
  "chair": "Manisha Pravin Chorbele",
  "prabhag": 21
 },
 {
  "office": "Kasba Peth",
  "chair": "Ujwala Ganesh Yadav",
  "prabhag": 24
 },
 {
  "office": "Hadapsar – Manjari",
  "chair": "Prashant Vasantrao Tupe",
  "prabhag": 17
 },
 {
  "office": "Sinhgad Road",
  "chair": "Sachin Raosaheb More",
  "prabhag": 35
 },
 {
  "office": "Warje – Karvenagar",
  "chair": "Manjushree Sandeep Khardekar",
  "prabhag": 29
 },
 {
  "office": "Dhankawadi – Katraj – Ambegaon",
  "chair": "Pratibha Rohidas Chorghe",
  "prabhag": 38
 },
 {
  "office": "Nagar Road – Wagholi",
  "chair": "Anil Dilip Satav",
  "prabhag": 3
 },
 {
  "office": "Vishrambaug Wada",
  "chair": "Raghvendra Bapu Mankar",
  "prabhag": 25
 }
];

export interface Leader { id: string; role: string; name: string; note: string }
// City-level office holders, from news reports and the PMC page on Wikipedia (dates in the note).
export const LEADERS: Leader[] = [
  { id: "mayor", role: "Mayor", name: "Manjusha Nagpure", note: "BJP, elected unopposed in February 2026 (corporator, prabhag 35)" },
  { id: "deputy-mayor", role: "Deputy Mayor", name: "Parshuram Wadekar", note: "RPI (A), corporator, prabhag 8" },
  { id: "commissioner", role: "Municipal Commissioner", name: "Naval Kishore Ram, IAS", note: "Took charge on 31 May 2025" },
  { id: "addl-commissioner-swm", role: "Additional Commissioner (Estate)", name: "Prajit Nair, IAS", note: "Holds Solid Waste Management, per the April 2026 reshuffle" },
];

// How to reach PMC. The toll-free and WhatsApp numbers are as reported by Free Press Journal on 23 Feb 2024.
export const PMC_CONTACT = {
  tollFree: "1800 1030 222",
  tollFreeTel: "18001030222",
  whatsapp: "96899 00002",
  whatsappLink: "https://wa.me/919689900002",
  site: "https://www.pmc.gov.in",
  wardOffices: "https://www.pmc.gov.in/en/ward-contacts",
};

export const DATA_NOTES = [
  "Corporators come from the 2026 election results on Wikipedia. Its summary table gives INC 16 and NCP 26 seats, but its winner rows add up to INC 15 and NCP 27, so one party label may be off by one.",
  "Ward-committee chairs come from a third-party directory, not from PMC.",
  "Assistant Municipal Commissioners for each ward office are not listed: PMC's ward-office page could not be read automatically and the only names found are from 2023. Use the PMC ward-office page for the current officer.",
];
