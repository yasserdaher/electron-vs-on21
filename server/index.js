import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";

import Admin from "../models/Admin.js";
import Job from "./models/Job.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use("/admin", express.static("admin"));

mongoose.connect("mongodb://127.0.0.1:27017/electronvision")
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

// إعداد تخزين ملفات التوظيف
const jobStorage = multer.diskStorage({
    destination: (req, file, cb)=> cb(null, "uploads/jobs"),
    filename: (req, file, cb)=> cb(null, Date.now() + "-" + file.originalname)
});
const uploadJob = multer({ storage: jobStorage });

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

// إعداد رفع ملفات النظام للأدمن
const fileStorage = multer.diskStorage({
    destination: (req, file, cb)=> cb(null, "uploads/files"),
    filename: (req, file, cb)=> cb(null, Date.now() + "-" + file.originalname)
});
const uploadFile = multer({ storage: fileStorage });

// رفع ملف النظام
app.post("/admin/upload-file", auth, uploadFile.single("file"), (req,res)=>{
    res.json({ msg: "تم رفع الملف بنجاح", filename: req.file.filename });
});

// ملفات الأدمن
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

// عرض طلبات التوظيف
app.get("/admin/applications", auth, async (req,res)=>{
    const apps = await Job.find().sort({createdAt:-1});
    res.json(apps);
});

// حذف طلب
app.delete("/admin/applications/:id", auth, async (req,res)=>{
    await Job.findByIdAndDelete(req.params.id);
    res.json({msg:"تم الحذف"});
});

app.listen(3000, ()=> console.log("Server running on port 3000"));
