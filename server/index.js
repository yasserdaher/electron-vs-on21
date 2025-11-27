// index.js
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";

import Admin from "./models/Admin.js";
import Job from "./models/Job.js";

const app = express();

// تفعيل CORS لأي رابط (يمكن تغييره لرابط مشروعك على Render)
app.use(cors({ origin: '*' }));

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use("/admin", express.static("admin"));

// الربط مع MongoDB (Render يعطيك MONGO_URL في البيئة)
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/electronvision";
mongoose.connect(MONGO_URL)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));

// حماية الأدمن
function auth(req, res, next){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.status(401).json({msg:"غير مصرح"});
    jwt.verify(token, "SECRETKEY", (err, admin)=>{
        if(err) return res.status(401).json({msg:"غير مصرح"});
        req.admin = admin;
        next();
    });
}

// Multer لإدارة رفع ملفات الوظائف
const jobStorage = multer.diskStorage({
    destination: (req, file, cb)=> cb(null, "uploads/jobs"),
    filename: (req, file, cb)=> cb(null, Date.now() + "-" + file.originalname)
});
const uploadJob = multer({ storage: jobStorage });

// Multer لإدارة رفع ملفات النظام
const fileStorage = multer.diskStorage({
    destination: (req, file, cb)=> cb(null, "uploads/files"),
    filename: (req, file, cb)=> cb(null, Date.now() + "-" + file.originalname)
});
const uploadFile = multer({ storage: fileStorage });

// إرسال طلب وظيفة
app.post("/apply", uploadJob.single("resume"), async (req, res) => {
    try {
        const newJob = new Job({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            file: req.file.filename
        });
        await newJob.save();
        res.json({ msg: "تم تقديم طلب الوظيفة بنجاح" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "تعذّر تقديم الطلب" });
    }
});

// عرض الملفات العامة
app.get("/files", (req, res) => {
    const dir = path.join("uploads/files");
    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ msg: "خطأ في قراءة الملفات" });
        res.json(files);
    });
});

// تحميل ملف
app.get("/download/file/:name", (req, res) => {
    const filePath = path.join("uploads/files", req.params.name);
    res.download(filePath);
});

// رفع ملف النظام (للأدمن)
app.post("/admin/upload-file", auth, uploadFile.single("file"), (req,res)=>{
    res.json({ msg: "تم رفع الملف بنجاح", filename: req.file.filename });
});

// جلب ملفات الأدمن
app.get("/admin/files", auth, (req,res)=>{
    const dir = path.join("uploads/files");
    fs.readdir(dir, (err, files)=>{
        if(err) return res.status(500).json({msg:"خطأ في قراءة الملفات"});
        res.json(files);
    });
});

// حذف ملف
app.delete("/admin/files/:filename", auth, (req,res)=>{
    const filePath = path.join("uploads/files", req.params.filename);
    fs.unlink(filePath, (err)=>{
        if(err) return res.status(500).json({msg:"خطأ في حذف الملف"});
        res.json({msg:"تم حذف الملف"});
    });
});

// تسجيل دخول الأدمن
app.post("/admin/login", async (req,res)=>{
    const admin = await Admin.findOne({username:req.body.username});
    if(!admin) return res.status(400).json({msg:"خطأ في اسم المستخدم"});
    const match = await bcrypt.compare(req.body.password, admin.password);
    if(!match) return res.status(400).json({msg:"خطأ في كلمة المرور"});
    const token = jwt.sign({id:admin._id}, "SECRETKEY", {expiresIn:"1d"});
    res.json({token});
});

// جلب طلبات الوظائف
app.get("/admin/applications", auth, async (req,res)=>{
    const apps = await Job.find().sort({createdAt:-1});
    res.json(apps);
});

// حذف طلب وظيفة
app.delete("/admin/applications/:id", auth, async (req,res)=>{
    await Job.findByIdAndDelete(req.params.id);
    res.json({msg:"تم الحذف"});
});

// استخدام البورت من Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
